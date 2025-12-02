import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import CancelledOrder from '@/lib/models/CancelledOrder';
import CancelledOrderItem from '@/lib/models/CancelledOrderItem';

/**
 * GET /api/orders/client/cancelled
 * Get client's cancelled orders
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
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const skip = (page - 1) * limit;

    // Build filter for archived cancelled orders
    const filter = {
      userId: session.user.id,
    };

    // Date range filter
    if (startDate || endDate) {
      filter.cancelledAt = {};
      if (startDate) filter.cancelledAt.$gte = new Date(startDate);
      if (endDate) filter.cancelledAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const orders = await CancelledOrder.find(filter)
      .sort({ cancelledAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get cancelled order items
    let ordersWithItems = orders;
    if (orders.length > 0) {
      const cancelledIds = orders.map((order) => order._id);
      const orderItems = await CancelledOrderItem.find({ cancelledOrderId: { $in: cancelledIds } }).lean();

      const itemsByOrder = orderItems.reduce((acc, item) => {
        const key = item.cancelledOrderId.toString();
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});

      ordersWithItems = orders.map((order) => ({
        ...order,
        items: itemsByOrder[order._id.toString()] || [],
      }));
    }

    const total = await CancelledOrder.countDocuments(filter);

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
    console.error('[API] Error fetching cancelled orders:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
