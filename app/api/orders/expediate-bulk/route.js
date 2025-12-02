import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import ecotrackService from '@/lib/services/ecotrack.service';

/**
 * POST /api/orders/expediate-bulk
 * Expediate multiple orders to EcoTrack (admin only)
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

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'orderIds array is required' },
        { status: 400 }
      );
    }

    // Find all orders
    const orders = await Order.find({ _id: { $in: orderIds } })
      .populate('wilaya_id')
      .populate('commune_id');

    if (orders.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No orders found' },
        { status: 404 }
      );
    }

    // Validate and prepare expedition data
    const expeditionData = [];
    const errors = [];

    for (const order of orders) {
      // Validate order status
      if (order.status !== 'confirmed') {
        errors.push({
          orderId: order._id,
          order_number: order.order_number,
          error: `Order must be confirmed (current: ${order.status})`,
        });
        continue;
      }

      // Check if already expediated
      if (order.ecotrack_order_id) {
        errors.push({
          orderId: order._id,
          order_number: order.order_number,
          error: 'Already expediated',
        });
        continue;
      }

      // Validate wilaya
      if (!order.wilaya_id?.ecotrack_id) {
        errors.push({
          orderId: order._id,
          order_number: order.order_number,
          error: 'Wilaya missing EcoTrack ID',
        });
        continue;
      }

      // Add to expedition list
      expeditionData.push({
        orderId: order._id.toString(),
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        ecotrack_wilaya_id: order.wilaya_id.ecotrack_id,
        ecotrack_commune_id: order.commune_id?.ecotrack_id || null,
        shipping_address: order.shipping_address || '',
        delivery_type: order.delivery_type || 'home',
        total: order.total,
        subtotal: order.subtotal,
        weight: order.weight || 1,
        notes: order.notes || '',
      });
    }

    if (expeditionData.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No valid orders to expediate',
          errors 
        },
        { status: 400 }
      );
    }

    // Call EcoTrack service for batch expedition
    console.log(`[Bulk Expedition] Expediating ${expeditionData.length} orders to EcoTrack...`);
    const results = await ecotrackService.expediateMultipleOrders(expeditionData);

    // Update successful orders
    for (const success of results.successful) {
      await Order.findByIdAndUpdate(success.orderId, {
        ecotrack_order_id: success.ecotrackOrderId,
        ecotrack_tracking_number: success.trackingNumber,
        status: 'sent',
        expedition_date: success.expeditionDate,
        ecotrack_status: 'pending',
      });
    }

    // Combine EcoTrack failures with validation errors
    const allErrors = [
      ...errors,
      ...results.failed.map(f => ({
        orderId: f.orderId,
        error: f.error,
      })),
    ];

    return NextResponse.json({
      success: true,
      data: {
        total: orderIds.length,
        successful: results.successful.length,
        failed: allErrors.length,
        successfulOrders: results.successful,
        failedOrders: allErrors,
      },
      message: `Expediated ${results.successful.length} out of ${orderIds.length} orders`,
    });
  } catch (error) {
    console.error('[API] Error in bulk expedition:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to expediate orders',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
