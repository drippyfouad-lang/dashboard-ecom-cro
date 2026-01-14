import { authOptions } from '@/lib/auth';
import Order from '@/lib/models/Order';
import OrderItem from '@/lib/models/OrderItem';
import dbConnect from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { id } = await params;

    // Get order with populated references
    const order = await Order.findById(id)
      .populate('wilayaId', 'name code shippingPriceHome shippingPriceDesk')
      .populate('communeId', 'name shippingPriceHome shippingPriceDesk')
      .lean();

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Get order items with populated product references
    const items = await OrderItem.find({ orderId: id })
      .populate('productId', 'name price stockQuantity images sizes colors')
      .lean();

    const normalizedItems = items.map((item) => {
      const productDocument = item.productId && typeof item.productId === 'object'
        ? item.productId
        : null;
      const resolvedProductId = productDocument?._id || item.productId;

      return {
        ...item,
        price: item.unitPrice,
        product_id: resolvedProductId,
        product_name: item.productName || productDocument?.name || '',
        product_image: productDocument?.images?.[0] || '',
        available_sizes: productDocument?.sizes || [],
        available_colors: productDocument?.colors || [],
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        items: normalizedItems,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch order',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { id } = await params;
    const body = await request.json();

    const {
      items: incomingItems,
      shippingCost: incomingShippingCost,
      ...orderFields
    } = body;

    // Find existing order
    const existingOrder = await Order.findById(id);
    if (!existingOrder) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // If payment status is being changed to paid, record the payment date
    if (body.paymentStatus === 'paid' && existingOrder.paymentStatus !== 'paid' && !body.paidAt) {
      body.paidAt = new Date();
    }

    const updatePayload = { ...orderFields };

    // Process items if provided in payload
    if (Array.isArray(incomingItems)) {
      if (incomingItems.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Order must include at least one item' },
          { status: 400 }
        );
      }

      for (const item of incomingItems) {
        const productId = item.productId?._id || item.productId || item.product_id;
        const unitPrice = typeof item.unitPrice !== 'undefined' ? item.unitPrice : (item.price || 0);
        const numericPrice = Number(unitPrice);

        if (!productId) {
          return NextResponse.json(
            { success: false, error: 'Each item must have a valid product' },
            { status: 400 }
          );
        }

        if (!item.quantity || item.quantity <= 0) {
          return NextResponse.json(
            { success: false, error: 'Item quantity must be at least 1' },
            { status: 400 }
          );
        }

        if (typeof unitPrice === 'undefined' || Number.isNaN(numericPrice)) {
          return NextResponse.json(
            { success: false, error: 'Item price is required' },
            { status: 400 }
          );
        }
      }

      const processedItems = incomingItems.map((item) => {
        const productDocument = item.productId && typeof item.productId === 'object'
          ? item.productId
          : null;

        const resolvedProductId =
          productDocument?._id || productDocument?.id || item.productId || item.product_id;
        const resolvedPriceRaw = typeof item.unitPrice !== 'undefined' ? item.unitPrice : (item.price || 0);
        const resolvedPrice = Number(resolvedPriceRaw) || 0;
        const qty = Number(item.quantity || 1);

        return {
          orderId: existingOrder._id,
          productId: resolvedProductId,
          productName: item.productName || item.product_name || productDocument?.name || '',
          quantity: qty,
          unitPrice: resolvedPrice,
          sku: item.sku || `${resolvedProductId}-default`,
          selectedSize: item.selectedSize || item.size || item.selected_size || '',
          selectedColor: item.selectedColor || item.color || item.selected_color || '',
          total: qty * resolvedPrice,
        };
      });

      const subtotal = processedItems.reduce(
        (sum, item) => sum + item.total,
        0
      );

      const shippingCostValue =
        typeof incomingShippingCost !== 'undefined'
          ? Number(incomingShippingCost) || 0
          : existingOrder.shippingCost || 0;

      updatePayload.subtotal = subtotal;
      updatePayload.shippingCost = shippingCostValue;
      updatePayload.total = subtotal + shippingCostValue;

      // Replace order items
      await OrderItem.deleteMany({ orderId: id });
      await OrderItem.insertMany(processedItems);
    }

    // Normalize shipping cost when provided without touching totals
    if (
      typeof incomingShippingCost !== 'undefined' &&
      !Array.isArray(incomingItems)
    ) {
      updatePayload.shippingCost = Number(incomingShippingCost) || 0;
      updatePayload.total = (existingOrder.subtotal || 0) + updatePayload.shippingCost;
    }

    // Update order
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      {
        $set: {
          ...updatePayload,
          updatedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    )
      .populate('wilayaId', 'name code')
      .populate('communeId', 'name')
      .lean();

    // Fetch updated items
    const updatedItems = await OrderItem.find({ orderId: id })
      .populate('productId', 'name price images sizes colors')
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        ...updatedOrder,
        items: updatedItems,
      },
      message: 'Order updated successfully',
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

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { id } = await params;

    // Check if order exists
    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // REMOVED: Status restriction - admin can delete any order at any time
    // This gives full control to administrators

    // Delete order items first
    await OrderItem.deleteMany({ orderId: id });

    // Delete order
    await Order.findByIdAndDelete(id);

    // Verify deletion by querying
    const verifyDeleted = await Order.findById(id);
    if (verifyDeleted) {
      return NextResponse.json(
        { success: false, error: 'Order deletion verification failed', deleted: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        deleted: false,
        error: error.message || 'Failed to delete order',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
