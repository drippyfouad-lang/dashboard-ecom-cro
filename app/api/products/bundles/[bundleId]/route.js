import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import ProductBundle from '@/lib/models/ProductBundle';
import Product from '@/lib/models/Product';

// GET /api/products/bundles/[bundleId] - Get a specific bundle by ID
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { bundleId } = await params;
    const bundle = await ProductBundle.findById(bundleId)
      .populate('productId', 'name price')
      .lean();

    if (!bundle) {
      return NextResponse.json(
        { success: false, error: 'Bundle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bundle,
    });
  } catch (error) {
    console.error('GET /api/products/bundles/[bundleId] error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/products/bundles/[bundleId] - Update a bundle
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { bundleId } = await params;
    const body = await request.json();
    const { quantity, discount, active, startDate, endDate } = body;

    // Validate required fields
    if (quantity !== undefined && quantity < 1) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be at least 1' },
        { status: 400 }
      );
    }

    if (discount !== undefined && discount < 0) {
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

    // Build update object
    const updateData = {};
    if (quantity !== undefined) updateData.quantity = quantity;
    if (discount !== undefined) updateData.discount = discount;
    if (active !== undefined) updateData.active = active;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;

    const bundle = await ProductBundle.findByIdAndUpdate(
      bundleId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('productId', 'name price')
      .lean();

    if (!bundle) {
      return NextResponse.json(
        { success: false, error: 'Bundle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bundle,
    });
  } catch (error) {
    console.error('PUT /api/products/bundles/[bundleId] error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/products/bundles/[bundleId] - Delete a bundle
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { bundleId } = await params;
    const bundle = await ProductBundle.findByIdAndDelete(bundleId);

    if (!bundle) {
      return NextResponse.json(
        { success: false, error: 'Bundle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bundle,
      message: 'Bundle deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/products/bundles/[bundleId] error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


