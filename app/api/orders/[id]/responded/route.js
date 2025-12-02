import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import Order from '@/lib/models/Order';

/**
 * PATCH /api/orders/[id]/responded
 * Toggle or set responded status for an order
 */
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
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
        { success: false, error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { responded } = body;

    // Find the order
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update responded status
    const newRespondedValue = typeof responded === 'boolean' 
      ? responded 
      : !order.responded; // Toggle if not specified

    order.responded = newRespondedValue;
    
    if (newRespondedValue) {
      order.responded_at = new Date();
      order.responded_by = session.user.id;
    }

    await order.save();

    // Return updated order
    const updatedOrder = await Order.findById(id)
      .populate('wilaya_id', 'name')
      .populate('commune_id', 'name')
      .lean();

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      responded: newRespondedValue,
      message: newRespondedValue ? 'Marked as responded' : 'Marked as not responded',
    });
  } catch (error) {
    console.error('[API] Error updating responded status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
