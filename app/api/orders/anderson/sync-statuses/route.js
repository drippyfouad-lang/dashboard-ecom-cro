import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import ecotrackService from '@/lib/services/ecotrack.service';

/**
 * POST /api/orders/anderson/sync-statuses
 * Sync order statuses with EcoTrack (admin only)
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const { orderIds } = body;

    let ordersToSync;

    if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      // Sync specific orders
      ordersToSync = await Order.find({
        _id: { $in: orderIds },
        ecotrack_order_id: { $exists: true, $ne: null },
      });
    } else {
      // Sync all active orders with EcoTrack IDs
      ordersToSync = await Order.find({
        status: { $in: ['sent', 'shipped', 'out-for-delivery'] },
        ecotrack_order_id: { $exists: true, $ne: null },
      }).limit(100); // Limit to avoid overload
    }

    if (ordersToSync.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orders to sync',
        data: {
          total: 0,
          synced: 0,
          failed: 0,
        },
      });
    }

    console.log(`[Sync] Syncing ${ordersToSync.length} orders with EcoTrack...`);

    // Extract EcoTrack order IDs
    const ecotrackOrderIds = ordersToSync.map(order => order.ecotrack_order_id);

    // Sync with EcoTrack
    const results = await ecotrackService.syncOrderStatuses(ecotrackOrderIds);

    // Update orders with synced statuses
    const updatePromises = results.synced.map(async (statusData) => {
      const order = ordersToSync.find(
        o => o.ecotrack_order_id === statusData.ecotrackOrderId
      );

      if (!order) return null;

      // Map EcoTrack status to internal status
      const newStatus = ecotrackService.mapStatus(statusData.status);

      // Prepare updates
      const updates = {
        ecotrack_status: statusData.status,
        status: newStatus,
      };

      // Update specific date fields based on status
      if (newStatus === 'shipped' && !order.shipping_date) {
        updates.shipping_date = new Date();
      } else if (newStatus === 'delivered' && !order.delivery_date) {
        updates.delivery_date = new Date();
      } else if (newStatus === 'returned' && !order.return_date) {
        updates.return_date = new Date();
      }

      return Order.findByIdAndUpdate(order._id, updates, { new: true });
    });

    const updatedOrders = await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: `Synced ${results.synced.length} orders successfully`,
      data: {
        total: ordersToSync.length,
        synced: results.synced.length,
        failed: results.failed.length,
        failedOrders: results.failed,
        updatedOrders: updatedOrders.filter(Boolean),
      },
    });
  } catch (error) {
    console.error('[API] Error syncing statuses:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to sync statuses',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
