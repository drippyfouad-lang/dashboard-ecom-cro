import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import Order from '@/lib/models/Order';
import OrderItem from '@/lib/models/OrderItem';
import CancelledOrder from '@/lib/models/CancelledOrder';
import CancelledOrderItem from '@/lib/models/CancelledOrderItem';

/**
 * PUT /api/orders/[id]/cancel
 * Cancel an order (client or admin)
 * Archives order to cancelled_orders collection
 */
export async function PUT(request, { params }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession) {
      await session.abortTransaction();
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { id } = params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      return NextResponse.json(
        { success: false, error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { reason, notes } = body;

    // Find the order with populated references
    const order = await Order.findById(id)
      .populate('wilayaId', 'name')
      .populate('communeId', 'name')
      .session(session);

    if (!order) {
      await session.abortTransaction();
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check authorization
    const isAdmin = authSession.user.role === 'admin' || authSession.user.role === 'moderator';
    const isOwner = order.user_id?.toString() === authSession.user.id;

    if (!isAdmin && !isOwner) {
      await session.abortTransaction();
      return NextResponse.json(
        { success: false, error: 'You do not have permission to cancel this order' },
        { status: 403 }
      );
    }

    // Check if order can be cancelled
    if (!['pending', 'confirmed', 'pre-sent'].includes(order.status)) {
      await session.abortTransaction();
      return NextResponse.json(
        { success: false, error: `Order cannot be cancelled. Current status: ${order.status}` },
        { status: 400 }
      );
    }

    // Get order items
  const orderItems = await OrderItem.find({ orderId: id }).session(session);

    // Create cancelled order record
    const cancelledOrderData = {
      originalOrderId: order._id,
      userId: order.userId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      wilayaId: order.wilayaId?._id || order.wilayaId,
      wilayaName: order.wilayaId?.name || order.wilayaName || null,
      wilayaCode: order.wilayaCode,
      communeId: order.communeId?._id || order.communeId,
      communeName: order.communeId?.name || order.communeName || null,
      shippingAddress: order.shippingAddress,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      notes: order.notes,
      status: 'cancelled',
      cancellationReason: reason || 'client-cancelled-by-phone',
      cancellationNotes: notes || '',
      cancelledAt: new Date(),
      cancelledBy: authSession.user.id,
      originalCreatedAt: order.createdAt,
      orderNumber: order.orderNumber,
      deliveryType: order.deliveryType,
      weight: order.weight,
      confirmedAt: order.confirmedAt,
      ecotrackOrderId: order.ecotrackOrderId,
      ecotrackTrackingNumber: order.ecotrackTrackingNumber,
    };

    const cancelledOrder = await CancelledOrder.create([cancelledOrderData], { session });

    // Create cancelled order items
    if (orderItems.length > 0) {
      const cancelledItems = orderItems.map(item => ({
        cancelledOrderId: cancelledOrder[0]._id,
        originalOrderItemId: item._id,
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor,
        totalPrice: item.unitPrice * item.quantity,
      }));

      await CancelledOrderItem.insertMany(cancelledItems, { session });
    }

    // Update original order status
    order.status = 'cancelled';
    order.cancellationReason = reason || 'client-cancelled-by-phone';
    order.cancelledAt = new Date();
    order.cancelledBy = authSession.user.id;

    await order.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // Populate and return updated order
    const updatedOrder = await Order.findById(id)
      .populate('wilayaId', 'name')
      .populate('communeId', 'name')
      .populate('cancelledBy', 'name email role')
      .lean();

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      archived: true,
      message: 'Order cancelled and archived successfully',
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('[API] Error cancelling order:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    session.endSession();
  }
}
