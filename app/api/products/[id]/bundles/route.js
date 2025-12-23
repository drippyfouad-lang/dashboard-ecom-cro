import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ProductBundle from '@/lib/models/ProductBundle';
import Product from '@/lib/models/Product';

// GET /api/products/[id]/bundles - List all bundles for a product
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

    // Build query
    const query = { productId: id };
    if (active !== null && active !== undefined) {
      query.active = active === 'true';
    }

    const bundles = await ProductBundle.find(query)
      .populate('productId', 'name price')
      .sort({ quantity: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: bundles,
    });
  } catch (error) {
    console.error('GET /api/products/[id]/bundles error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/products/[id]/bundles - Create a new bundle for a product
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { quantity, discount, active, startDate, endDate } = body;

    // Validate product exists
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be at least 1' },
        { status: 400 }
      );
    }

    if (discount === undefined || discount < 0) {
      return NextResponse.json(
        { success: false, error: 'Discount must be a non-negative number' },
        { status: 400 }
      );
    }

    // Validate dates if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        return NextResponse.json(
          { success: false, error: 'End date must be after start date' },
          { status: 400 }
        );
      }
    }

    // Create bundle
    const bundle = await ProductBundle.create({
      productId: id,
      quantity,
      discount,
      active: active !== undefined ? active : true,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    });

    const populatedBundle = await ProductBundle.findById(bundle._id)
      .populate('productId', 'name price')
      .lean();

    return NextResponse.json({
      success: true,
      data: populatedBundle,
    });
  } catch (error) {
    console.error('POST /api/products/[id]/bundles error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

