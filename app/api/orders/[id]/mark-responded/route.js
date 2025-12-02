import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Order from '@/lib/models/Order';

/**
 * PUT /api/orders/[id]/mark-responded
 * Mark order as responded (admin only)
 * This is for tracking client communication, doesn't change status
 */
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { id } = params;

    // Find the order
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order is in a state where response tracking is relevant
    if (!['pending', 'confirmed'].includes(order.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot mark response for order in ${order.status} status` },
        { status: 400 }
      );
    }

    // Add responded tracking field
    order.client_responded = true;
    order.responded_at = new Date();
    order.responded_by = session.user.id;

    await order.save();

    // Populate and return
    const updatedOrder = await Order.findById(id)
      .populate('wilaya_id', 'name')
      .populate('commune_id', 'name')
      .populate('responded_by', 'name email role')
      .lean();

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Order marked as responded',
    });
  } catch (error) {
    console.error('[API] Error marking order as responded:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
