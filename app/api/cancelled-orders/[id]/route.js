import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import CancelledOrder from '@/lib/models/CancelledOrder';
import CancelledOrderItem from '@/lib/models/CancelledOrderItem';

/**
 * GET /api/cancelled-orders/[id]
 * Fetch a single cancelled order with all its items
 */
export async function GET(request, { params }) {
  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { id } = params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid cancelled order ID' },
        { status: 400 }
      );
    }

    // Get cancelled order with populated references
    const cancelledOrder = await CancelledOrder.findById(id)
      .populate('wilaya_id', 'name shipping_price_home shipping_price_desk')
      .populate('commune_id', 'name shipping_price_home shipping_price_desk')
      .populate('cancelled_by', 'name email role')
      .lean();

    if (!cancelledOrder) {
      return NextResponse.json(
        { success: false, error: 'Cancelled order not found' },
        { status: 404 }
      );
    }

    // Get cancelled order items with populated product references
    const items = await CancelledOrderItem.find({ cancelled_order_id: id })
      .populate('product_id', 'name price stock_quantity images')
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        ...cancelledOrder,
        items,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching cancelled order:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
