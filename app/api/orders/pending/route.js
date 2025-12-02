import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import OrderItem from '@/lib/models/OrderItem';
import Product from '@/lib/models/Product';

/**
 * GET /api/orders/pending
 * Get all pending (non-treated) orders - admin only
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

    // Build filter - ONLY pending orders
    const filter = { status: 'pending' };

    // Search by customer name, phone
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
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
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
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
      }));
    }

    const total = await Order.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: ordersWithItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[API] Error fetching pending orders:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
