import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import OrderItem from '@/lib/models/OrderItem';

/**
 * GET /api/orders/anderson/sent
 * Get orders that have been sent to EcoTrack (admin only)
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

    // Build filter - sent orders
    const filter = { status: 'sent' };

    // Search
    if (search) {
      filter.$or = [
        { customer_name: { $regex: search, $options: 'i' } },
        { customer_phone: { $regex: search, $options: 'i' } },
        { order_number: { $regex: search, $options: 'i' } },
        { ecotrack_tracking_number: { $regex: search, $options: 'i' } },
      ];
    }

    // Date range filter (by expedition_date)
    if (startDate || endDate) {
      filter.expedition_date = {};
      if (startDate) filter.expedition_date.$gte = new Date(startDate);
      if (endDate) filter.expedition_date.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const orders = await Order.find(filter)
      .populate('wilaya_id', 'name code')
      .populate('commune_id', 'name')
      .sort({ expedition_date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get order items
    let ordersWithItems = orders;
    if (orders.length > 0) {
      const orderIds = orders.map((order) => order._id);
      const orderItems = await OrderItem.find({ order_id: { $in: orderIds } })
        .populate('product_id', 'name images')
        .lean();

      const itemsByOrder = orderItems.reduce((acc, item) => {
        const key = item.order_id.toString();
        if (!acc[key]) acc[key] = [];
        acc[key].push({
          ...item,
          product_name: item.product_name || item.product_id?.name || '',
          product_image: item.product_id?.images?.[0] || '',
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
    console.error('[API] Error fetching sent orders:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
