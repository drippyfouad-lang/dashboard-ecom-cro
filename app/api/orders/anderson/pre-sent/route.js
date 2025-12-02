import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import OrderItem from '@/lib/models/OrderItem';

/**
 * GET /api/orders/anderson/pre-sent
 * Get confirmed orders ready for expedition (admin only)
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
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const skip = (page - 1) * limit;

    // Build filter - confirmed orders awaiting expedition
  const filter = { status: 'confirmed' };

    // Search by customer name, phone, or order number
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { orderNumber: { $regex: search, $options: 'i' } },
      ];
    }

    // Date range filter (by confirmed_at)
    if (startDate || endDate) {
      filter.confirmedAt = {};
      if (startDate) filter.confirmedAt.$gte = new Date(startDate);
      if (endDate) filter.confirmedAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const orders = await Order.find(filter)
      .populate('wilayaId', 'name code')
      .populate('communeId', 'name')
      .populate('confirmedBy', 'name')
      .sort({ confirmedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get order items
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

    const formatOrder = (order) => ({
      ...order,
      customer_name: order.customerName ?? order.customer_name ?? '',
      customer_phone: order.customerPhone ?? order.customer_phone ?? '',
      order_number: order.orderNumber ?? order.order_number ?? order._id.toString(),
      wilaya_id: order.wilayaId ?? order.wilaya_id,
      commune_id: order.communeId ?? order.commune_id,
      confirmed_at: order.confirmedAt ?? order.confirmed_at,
      confirmed_by: order.confirmedBy ?? order.confirmed_by,
      created_at: order.createdAt ?? order.created_at,
    });

    const total = await Order.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: ordersWithItems.map(formatOrder),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[API] Error fetching pre-sent orders:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
