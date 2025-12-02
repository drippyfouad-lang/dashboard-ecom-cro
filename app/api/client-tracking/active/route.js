import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import OrderItem from '@/lib/models/OrderItem';

/**
 * GET /api/client-tracking/active
 * Get active orders (pending and confirmed) for client tracking
 */
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const skip = (page - 1) * limit;

    // Build filter - Only pending and confirmed orders
    const filter = { 
      status: { $in: ['pending', 'confirmed'] }
    };

    // Additional status filter
    if (status) {
      filter.status = status;
    }

    // Search by customer name, phone, or order number
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { orderNumber: { $regex: search, $options: 'i' } },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    // Get orders with populated references
    const orders = await Order.find(filter)
      .populate('wilayaId', 'name code')
      .populate('communeId', 'name')
      .populate('cancelledBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get order items for each order
    let ordersWithItems = orders;
    if (orders.length > 0) {
      const orderIds = orders.map((order) => order._id);
      const orderItems = await OrderItem.find({ orderId: { $in: orderIds } })
        .populate('productId', 'name images')
        .lean();

      const itemsByOrder = orderItems.reduce((acc, item) => {
        const key = item.orderId.toString();
        if (!acc[key]) acc[key] = [];
        acc[key].push({
          ...item,
          product_name: item.productName || item.productId?.name || '',
          product_image: item.productId?.images?.[0] || '',
        });
        return acc;
      }, {});

      ordersWithItems = orders.map((order) => ({
        ...order,
        items: itemsByOrder[order._id.toString()] || [],
      }));
    }

    const normalizeOrder = (order) => ({
      ...order,
      customer_name: order.customerName ?? order.customer_name ?? '',
      customer_phone: order.customerPhone ?? order.customer_phone ?? '',
      customer_email: order.customerEmail ?? order.customer_email ?? '',
      order_number: order.orderNumber ?? order.order_number ?? order._id.toString(),
      created_at: order.createdAt ?? order.created_at,
      cancelled_at: order.cancelledAt ?? order.cancelled_at,
      wilaya_id: order.wilayaId ?? order.wilaya_id,
      commune_id: order.communeId ?? order.commune_id,
      cancelled_by: order.cancelledBy ?? order.cancelled_by,
    });

    const total = await Order.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: ordersWithItems.map(normalizeOrder),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[API] Error fetching active orders:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
