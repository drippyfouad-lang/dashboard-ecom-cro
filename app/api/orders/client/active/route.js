import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import OrderItem from '@/lib/models/OrderItem';
import Product from '@/lib/models/Product';

/**
 * GET /api/orders/client/active
 * Get client's active orders (pending, confirmed, pre-sent, sent, shipped, out-for-delivery)
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status'); // 'pending' or 'delivered'

    // Build filter for active orders (not cancelled, not delivered yet)
    const filter = {
      userId: session.user.id,
      status: 'pending', // Only pending orders are "active"
    };

    // Apply specific status filter if provided
    if (statusFilter && ['pending', 'delivered'].includes(statusFilter)) {
      filter.status = statusFilter;
    }

    const orders = await Order.find(filter)
      .populate('wilayaId', 'name code')
      .populate('communeId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Get order items
    let ordersWithItems = orders;
    if (orders.length > 0) {
      const orderIds = orders.map((order) => order._id);
      const orderItems = await OrderItem.find({ orderId: { $in: orderIds } })
        .populate('productId', 'name images sizes colors')
        .lean();

      const itemsByOrder = orderItems.reduce((acc, item) => {
        const key = item.orderId.toString();
        if (!acc[key]) acc[key] = [];
        acc[key].push({
          ...item,
          product_name: item.productName || item.productId?.name || '',
          product_image: item.productId?.images?.[0] || '',
          available_sizes: item.productId?.sizes || [],
          available_colors: item.productId?.colors || [],
        });
        return acc;
      }, {});

      ordersWithItems = orders.map((order) => ({
        ...order,
        items: itemsByOrder[order._id.toString()] || [],
        can_cancel: order.status === 'pending',
      }));
    }

    return NextResponse.json({
      success: true,
      data: ordersWithItems,
      total: ordersWithItems.length,
    });
  } catch (error) {
    console.error('[API] Error fetching active orders:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
