import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Order from '@/lib/models/Order';

/**
 * PUT /api/orders/[id]/confirm
 * Confirm an order (admin only)
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

    // Check if order can be confirmed
    if (order.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Order cannot be confirmed. Current status: ${order.status}` },
        { status: 400 }
      );
    }

    // Update order status
  order.status = 'confirmed';
  order.confirmedAt = new Date();
  order.confirmedBy = session.user.id;

    await order.save();

    // Populate and return
    const updatedOrder = await Order.findById(id)
      .populate('wilayaId', 'name')
      .populate('communeId', 'name')
      .populate('confirmedBy', 'name email')
      .lean();

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Order confirmed successfully',
    });
  } catch (error) {
    console.error('[API] Error confirming order:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
