import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import OrderItem from '@/lib/models/OrderItem';

/**
 * GET /api/orders/tracking/[trackingNumber]
 * Public tracking - no authentication required
 */
export async function GET(request, { params }) {
  try {
    await dbConnect();

    const { trackingNumber } = params;

    if (!trackingNumber) {
      return NextResponse.json(
        { success: false, error: 'Tracking number is required' },
        { status: 400 }
      );
    }

    // Find order by tracking number or order number
    const order = await Order.findOne({
      $or: [
        { ecotrack_tracking_number: trackingNumber },
        { order_number: trackingNumber },
      ],
    })
      .populate('wilaya_id', 'name')
      .populate('commune_id', 'name')
      .lean();

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Get order items
    const orderItems = await OrderItem.find({ order_id: order._id })
      .populate('product_id', 'name images')
      .lean();

    const items = orderItems.map(item => ({
      product_name: item.product_name || item.product_id?.name || '',
      product_image: item.product_id?.images?.[0] || '',
      quantity: item.quantity,
      price: item.unit_price,
      size: item.selected_size,
      color: item.selected_color,
    }));

    // Return public tracking information (hide sensitive data)
    const trackingData = {
      order_number: order.order_number,
      ecotrack_tracking_number: order.ecotrack_tracking_number,
      status: order.status,
      created_at: order.created_at,
      confirmed_at: order.confirmed_at,
      expedition_date: order.expedition_date,
      shipping_date: order.shipping_date,
      delivery_date: order.delivery_date,
      return_date: order.return_date,
      wilaya: order.wilaya_id?.name,
      commune: order.commune_id?.name,
      total: order.total,
      items,
      // Status timeline
      timeline: [
        { status: 'pending', date: order.created_at, label: 'Order Placed' },
        order.confirmed_at && { status: 'confirmed', date: order.confirmed_at, label: 'Order Confirmed' },
        order.expedition_date && { status: 'sent', date: order.expedition_date, label: 'Sent to Delivery' },
        order.shipping_date && { status: 'shipped', date: order.shipping_date, label: 'In Transit' },
        order.delivery_date && { status: 'delivered', date: order.delivery_date, label: 'Delivered' },
        order.return_date && { status: 'returned', date: order.return_date, label: 'Returned' },
        order.cancelled_at && { status: 'cancelled', date: order.cancelled_at, label: 'Cancelled' },
      ].filter(Boolean),
    };

    return NextResponse.json({
      success: true,
      data: trackingData,
    });
  } catch (error) {
    console.error('[API] Error tracking order:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
