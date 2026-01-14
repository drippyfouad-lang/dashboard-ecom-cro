import { authOptions } from '@/lib/auth';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

// GET /api/products - List products with pagination and filters
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const stock = searchParams.get('stock') || '';
    const inStock = searchParams.get('in_stock') || '';

    // Build query
    const query = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (category && category !== 'All' && category !== '') {
      query.category_id = category;
    }

    // Handle both 'stock' and 'in_stock' parameters
    const stockParam = stock || inStock;
    if (stockParam && stockParam !== 'all' && stockParam !== 'All') {
      if (stockParam === 'in' || stockParam === 'true') {
        query.in_stock = true;
      } else if (stockParam === 'out' || stockParam === 'false') {
        query.in_stock = false;
      }
    }

    const skip = (page - 1) * limit;

    const products = await Product.find(query)
      .populate('category_id', 'name')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/products - Create new product
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    console.log('📦 Product creation request body:', JSON.stringify(body, null, 2));

    const {
      name,
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
      slug,
    } = body;

    // Validate required fields
    if (!name || !category_id || !price) {
      return NextResponse.json(
        { success: false, error: 'Name, category, and price are required' },
        { status: 400 }
      );
    }

    // Validate variants if provided
    if (variants && variants.length > 0) {
      const skus = variants.map(v => v.sku).filter(Boolean);
      const uniqueSkus = new Set(skus);
      if (skus.length !== uniqueSkus.size) {
        return NextResponse.json(
          { success: false, error: 'Variant SKUs must be unique' },
          { status: 400 }
        );
      }
    }

    // Create product with new fields
    const productData = {
      name: name.trim(),
      slug: slug || undefined, // Will be auto-generated if not provided
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
      variants: (variants && variants.length > 0) ? variants : [], // Ensure empty array if no variants
      salesCount: 0,
    };

    console.log('📝 Product data to create:', JSON.stringify(productData, null, 2));

    const product = await Product.create(productData);

    console.log('✅ Product created successfully:', product._id);

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('POST /api/products error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { success: false, error: error.message, details: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}
