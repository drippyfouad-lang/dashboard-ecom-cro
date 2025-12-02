import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Order from '@/lib/models/Order';

/**
 * Unified order update endpoint
 * Accepts partial updates and only modifies provided fields
 * Supports dynamic status changes without restrictions
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { orderId, ...updateFields } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Find existing order
    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Build update payload from provided fields only
    const updatePayload = {};
    
    // Allow dynamic status update (no restrictions)
    if (updateFields.status !== undefined) {
      updatePayload.status = updateFields.status;
    }

    // Allow dynamic payment status update (no restrictions)
    if (updateFields.payment_status !== undefined) {
      updatePayload.payment_status = updateFields.payment_status;
      
      // Auto-set paid_at when payment becomes Paid
      if (updateFields.payment_status === 'Paid' && existingOrder.payment_status !== 'Paid') {
        updatePayload.paid_at = new Date();
      }
    }

    // Allow other field updates
    const allowedFields = [
      'customer_name',
      'customer_email',
      'customer_phone',
      'wilaya_id',
      'commune_id',
      'shipping_address',
      'shipping_cost',
      'payment_method',
      'notes',
      'subtotal',
      'total'
    ];

    // Support responded flag (client tracking)
    if (updateFields.responded !== undefined) {
      updatePayload.responded = Boolean(updateFields.responded);
    }

    allowedFields.forEach(field => {
      if (updateFields[field] !== undefined) {
        updatePayload[field] = updateFields[field];
      }
    });

    // Always update the updated_at timestamp
    updatePayload.updated_at = new Date();

    // Perform the update
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: updatePayload },
      { new: true, runValidators: true }
    )
      .populate('wilaya_id', 'name')
      .populate('commune_id', 'name');

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: 'Failed to update order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Order updated successfully',
      updated_fields: Object.keys(updatePayload)
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update order',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
