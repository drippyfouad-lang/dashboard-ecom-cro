import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import cloudinary from '@/lib/cloudinary';

// GET /api/products/[id] - Get single product
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const product = await Product.findById(id).populate('category_id', 'name');
    
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('GET /api/products/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Update product
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      slug,
      category_id,
      sizes,
      colors,
      price,
      compareAtPrice,
      description,
      details,
      featured,
      active,
      topSelling,
      in_stock,
      stock_quantity,
      images,
      tags,
      variants,
    } = body;

    // Update product with new fields
    const product = await Product.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        slug: slug || undefined,
        category_id,
        sizes: sizes || [],
        colors: colors || [],
        price,
        compareAtPrice: compareAtPrice || undefined,
        description: description || '',
        details: details || {},
        featured: featured || false,
        active: active !== undefined ? active : true,
        topSelling: topSelling || false,
        in_stock: in_stock !== undefined ? in_stock : true,
        stock_quantity: stock_quantity || 0,
        images: images || [],
        tags: tags || [],
        variants: variants || [],
      },
      { new: true, runValidators: true }
    );

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('PUT /api/products/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete product and all images
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;

    // Get product to access images
    const product = await Product.findById(id);
    
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Delete images from Cloudinary if they exist
    if (product.images && product.images.length > 0) {
      for (const imageUrl of product.images) {
        try {
          // Extract public_id from Cloudinary URL
          const publicIdMatch = imageUrl.match(/\/products\/([^/]+)\.\w+$/);
          if (publicIdMatch) {
            await cloudinary.uploader.destroy(`products/${publicIdMatch[1]}`);
          }
        } catch (error) {
          console.error('Error deleting image from Cloudinary:', error);
        }
      }
    }

    // Delete product
    await Product.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
      data: product,
    });
  } catch (error) {
    console.error('DELETE /api/products/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
