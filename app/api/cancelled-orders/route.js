import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import CancelledOrder from '@/lib/models/CancelledOrder';
import CancelledOrderItem from '@/lib/models/CancelledOrderItem';

/**
 * GET /api/cancelled-orders
 * Fetch all cancelled orders with pagination and filtering
 */
export async function GET(request) {
  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const reason = searchParams.get('reason') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build query
    const query = {};

    // Search by customer name, phone, or order number
    if (search) {
      query.$or = [
        { customer_name: { $regex: search, $options: 'i' } },
        { customer_phone: { $regex: search, $options: 'i' } },
        { order_number: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by cancellation reason
    if (reason) {
      query.cancellation_reason = reason;
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      query.cancelled_at = {};
      if (dateFrom) {
        query.cancelled_at.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.cancelled_at.$lte = endDate;
      }
    }

    // Get total count
    const total = await CancelledOrder.countDocuments(query);

    // Get cancelled orders with pagination
    const cancelledOrders = await CancelledOrder.find(query)
      .populate('wilaya_id', 'name')
      .populate('commune_id', 'name')
      .populate('cancelled_by', 'name email role')
      .sort({ cancelled_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: cancelledOrders,
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
