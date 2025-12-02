import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Wilaya from '@/lib/models/Wilaya';
import Commune from '@/lib/models/Commune';
import ecotrackService from '@/lib/services/ecotrack.service';

/**
 * POST /api/orders/[id]/expediate
 * Expediate a single order to EcoTrack (admin only)
 */
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { id } = params;

    // Find the order with populated references
    const order = await Order.findById(id)
      .populate('wilaya_id')
      .populate('commune_id');

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Validate order can be expediated
    if (order.status !== 'confirmed') {
      return NextResponse.json(
        { success: false, error: `Order must be confirmed before expedition. Current status: ${order.status}` },
        { status: 400 }
      );
    }

    // Check if already expediated
    if (order.ecotrack_order_id) {
      return NextResponse.json(
        { success: false, error: 'Order has already been expediated to EcoTrack' },
        { status: 400 }
      );
    }

    // Validate wilaya and commune have ecotrack IDs
    if (!order.wilaya_id?.ecotrack_id) {
      return NextResponse.json(
        { success: false, error: 'Wilaya does not have EcoTrack ID. Please re-import wilayas.' },
        { status: 400 }
      );
    }

    // Prepare expedition data
    const expeditionData = {
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
    };

    // Call EcoTrack service
    console.log(`[Expedition] Expediating order ${order.order_number} to EcoTrack...`);
    const result = await ecotrackService.expediateOrder(expeditionData);

    // Update order with EcoTrack details
    order.ecotrack_order_id = result.ecotrackOrderId;
    order.ecotrack_tracking_number = result.trackingNumber;
    order.status = 'sent';
    order.expedition_date = result.expeditionDate;
    order.ecotrack_status = 'pending';

    await order.save();

    // Populate and return
    const updatedOrder = await Order.findById(id)
      .populate('wilaya_id', 'name')
      .populate('commune_id', 'name')
      .lean();

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      ecotrack: {
        orderId: result.ecotrackOrderId,
        trackingNumber: result.trackingNumber,
      },
      message: 'Order expediated successfully to EcoTrack',
    });
  } catch (error) {
    console.error('[API] Error expediating order:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to expediate order',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
