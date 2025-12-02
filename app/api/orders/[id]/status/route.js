import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import Order from '@/lib/models/Order';

/**
 * PATCH /api/orders/[id]/status
 * Update order status
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

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate status value
    const validStatuses = [
      'pending',
      'confirmed',
      'cancelled',
      'pre-sent',
      'sent',
      'shipped',
      'out-for-delivery',
      'delivered',
      'returned',
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Find the order
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update status and related fields
    order.status = status;

    if (status === 'confirmed' && !order.confirmed_at) {
      order.confirmed_at = new Date();
      order.confirmed_by = session.user.id;
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
      message: `Order status updated to ${status}`,
    });
  } catch (error) {
    console.error('[API] Error updating order status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
