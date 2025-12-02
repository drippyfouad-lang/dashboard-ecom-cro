import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import OrderItem from '@/lib/models/OrderItem';
import Product from '@/lib/models/Product';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 15;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const payment = searchParams.get('payment') || '';
    const paymentStatus = searchParams.get('payment_status') || payment;
    const dateFilter = searchParams.get('date') || '';
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};

    // Search by customer name or phone
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by order status
    if (status) {
      filter.status = status;
    }

    // Filter by payment status
    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    // Filter by date
    if (dateFilter) {
      const now = new Date();
      let startOfPeriod;
      
      switch (dateFilter) {
        case 'today':
          startOfPeriod = new Date(now.setHours(0, 0, 0, 0));
          filter.createdAt = { $gte: startOfPeriod };
          break;
        case 'week':
          startOfPeriod = new Date(now.setDate(now.getDate() - 7));
          filter.createdAt = { $gte: startOfPeriod };
          break;
        case 'month':
          startOfPeriod = new Date(now.setMonth(now.getMonth() - 1));
          filter.createdAt = { $gte: startOfPeriod };
          break;
        case 'custom':
          if (startDate && endDate) {
            filter.createdAt = {
              $gte: new Date(startDate),
              $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            };
          } else if (startDate) {
            filter.createdAt = { $gte: new Date(startDate) };
          } else if (endDate) {
            filter.createdAt = { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) };
          }
          break;
      }
    } else if (startDate || endDate) {
      // Handle custom date range without dateFilter
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    // Get orders with populated references
    const orders = await Order.find(filter)
      .populate('wilayaId', 'name code')
      .populate('communeId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    let ordersWithItems = orders;

    if (orders.length > 0) {
      const orderIds = orders.map((order) => order._id);

      const orderItems = await OrderItem.find({ orderId: { $in: orderIds } })
        .populate('productId', 'name price images sizes colors')
        .lean();

      const itemsByOrder = orderItems.reduce((acc, item) => {
        const key = item.orderId.toString();
        const normalizedItem = {
          ...item,
          price: item.unitPrice,
          product_id: item.productId?._id || item.productId,
          product_name: item.productName || item.productId?.name || '',
          product_image: item.productId?.images?.[0] || '',
          available_sizes: item.productId?.sizes || [],
          available_colors: item.productId?.colors || [],
        };

        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(normalizedItem);
        return acc;
      }, {});

      ordersWithItems = orders.map((order) => ({
        ...order,
        items: itemsByOrder[order._id.toString()] || [],
      }));
    }

    // Get total count for pagination
    const total = await Order.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: ordersWithItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch orders',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const {
      customerName,
      customerPhone,
      wilayaId,
      wilayaName,
      wilayaCode,
      communeId,
      communeName,
      deliveryType,
      items, // Array of { productId, productName, quantity, unitPrice, selectedSize, selectedColor, sku }
      shippingCost,
      paymentMethod,
    } = body;

    // Validation
    if (!customerName || !customerPhone || !wilayaId || !wilayaName || !wilayaCode || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: customerName, customerPhone, wilayaId, wilayaName, wilayaCode, and items are required' },
        { status: 400 }
      );
    }

    // Calculate total
    const subtotal = items.reduce((sum, item) => {
      const price = Number(item.unitPrice || item.price || 0);
      const qty = Number(item.quantity || 0);
      return sum + (price * qty);
    }, 0);
    const total = subtotal + Number(shippingCost || 0);

    // Create order
    const order = await Order.create({
      customerName,
      customerPhone,
      wilayaId,
      wilayaName,
      wilayaCode,
      communeId,
      communeName: communeName || '',
      deliveryType: deliveryType || 'to_home',
      subtotal,
      shippingCost: Number(shippingCost || 0),
      total,
      paymentMethod: paymentMethod || 'Cash on Delivery',
      status: 'pending',
      paymentStatus: 'pending',
    });

    // Create order items
    const orderItems = items.map((item) => ({
      orderId: order._id,
      productId: item.productId || item.product_id,
      productName: item.productName || item.product_name,
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || item.price || 0),
      sku: item.sku || `${item.productId || item.product_id}-default`,
      selectedSize: item.selectedSize || item.size || item.selected_size || '',
      selectedColor: item.selectedColor || item.color || item.selected_color || '',
      total: Number(item.quantity || 1) * Number(item.unitPrice || item.price || 0),
    }));

    await OrderItem.insertMany(orderItems);

    // Populate and return the created order
    const populatedOrder = await Order.findById(order._id)
      .populate('wilayaId', 'name code')
      .populate('communeId', 'name')
      .lean();

    // Fetch order items
    const createdItems = await OrderItem.find({ orderId: order._id })
      .populate('productId', 'name price images sizes colors')
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        ...populatedOrder,
        items: createdItems,
      },
      message: 'Order created successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create order',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
