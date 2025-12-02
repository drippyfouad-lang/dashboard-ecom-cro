import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Category from '@/lib/models/Category';
import Product from '@/lib/models/Product';
import cloudinary from '@/lib/cloudinary';

// GET /api/categories/[id] - Get single category
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const category = await Category.findById(id);

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('GET /api/categories/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/categories/[id] - Update category
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const { name, image, oldImage } = body;

    // Find current category
    const currentCategory = await Category.findById(id);
    if (!currentCategory) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    // Delete old image from Cloudinary if new image is provided
    if (image && oldImage && oldImage !== image) {
      try {
        // Extract public_id from Cloudinary URL
        const urlParts = oldImage.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExtension.split('.')[0];
        await cloudinary.uploader.destroy(`categories/${publicId}`);
      } catch (error) {
        console.error('Error deleting old image:', error);
      }
    }

    // Update category
    const category = await Category.findByIdAndUpdate(
      id,
      { name: name.trim(), image: image || currentCategory.image },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('PUT /api/categories/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - Delete category
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;

    // Check if category has products
    const productCount = await Product.countDocuments({ category_id: id });
    if (productCount > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete category with ${productCount} products` },
        { status: 400 }
      );
    }

    const category = await Category.findById(id);
    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    // Delete image from Cloudinary
    if (category.image) {
      try {
        const urlParts = category.image.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExtension.split('.')[0];
        await cloudinary.uploader.destroy(`categories/${publicId}`);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }

    await Category.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/categories/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
