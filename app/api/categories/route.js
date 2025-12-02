import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Category from '@/lib/models/Category';
import cloudinary from '@/lib/cloudinary';

// GET /api/categories - List categories with pagination
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
    const all = searchParams.get('all') === 'true';

    // Build query
    const query = {};
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // If all=true, return all categories without pagination (for dropdowns)
    if (all) {
      const categories = await Category.find(query).sort({ name: 1 });
      return NextResponse.json({
        success: true,
        data: categories,
      });
    }

    const skip = (page - 1) * limit;

    const [categories, total] = await Promise.all([
      Category.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      Category.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: categories,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create new category
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { name, image } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category already exists' },
        { status: 400 }
      );
    }

    // Create category
    const category = await Category.create({
      name: name.trim(),
      image: image || '',
    });

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('POST /api/categories error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
