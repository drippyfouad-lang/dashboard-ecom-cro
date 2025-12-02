import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import CancelledOrder from '@/lib/models/CancelledOrder';
import CancelledOrderItem from '@/lib/models/CancelledOrderItem';

/**
 * GET /api/client-tracking/cancelled
 * Get cancelled orders for client tracking
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
    const reason = searchParams.get('reason') || '';
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const skip = (page - 1) * limit;

    // Build filter for archived cancelled orders
    const filter = {};

    // Filter by cancellation reason
    if (reason) {
      filter.cancellationReason = reason;
    }

    // Search by customer name, phone, or order number
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { orderNumber: { $regex: search, $options: 'i' } },
      ];
    }

    // Date range filter on cancelled_at
    if (startDate || endDate) {
      filter.cancelledAt = {};
      if (startDate) filter.cancelledAt.$gte = new Date(startDate);
      if (endDate) filter.cancelledAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const orders = await CancelledOrder.find(filter)
      .populate('wilayaId', 'name code')
      .populate('communeId', 'name')
      .populate('cancelledBy', 'name email')
      .sort({ cancelledAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    let ordersWithItems = orders;
    if (orders.length > 0) {
      const orderIds = orders.map((order) => order._id);
      const cancelledItems = await CancelledOrderItem.find({ cancelledOrderId: { $in: orderIds } })
        .populate('productId', 'name images')
        .lean();

      const itemsByOrder = cancelledItems.reduce((acc, item) => {
        const key = item.cancelledOrderId.toString();
        if (!acc[key]) acc[key] = [];
        acc[key].push({
          ...item,
          orderId: item.cancelledOrderId,
          product_name: item.productName || item.productId?.name || '',
          product_image: item.productId?.images?.[0] || '',
          price: item.unitPrice,
          total: item.totalPrice,
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
      cancelled_at: order.cancelledAt ?? order.cancelled_at,
      cancellation_reason: order.cancellationReason ?? order.cancellation_reason,
      cancellation_notes: order.cancellationNotes ?? order.cancellation_notes,
      wilaya_id: order.wilayaId ?? order.wilaya_id,
      commune_id: order.communeId ?? order.commune_id,
      cancelled_by: order.cancelledBy ?? order.cancelled_by,
      created_at: order.originalCreatedAt ?? order.created_at,
    });

    const total = await CancelledOrder.countDocuments(filter);

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
    console.error('[API] Error fetching cancelled orders:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
