import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Wilaya from '@/lib/models/Wilaya';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    // If all=true, return all wilayas without pagination
    if (all) {
      const wilayas = await Wilaya.find(filter).sort({ code: 1 });
      return NextResponse.json({
        success: true,
        data: wilayas,
      });
    }

    // Get wilayas with pagination
    const wilayas = await Wilaya.find(filter).sort({ code: 1 }).skip(skip).limit(limit);

    // Get total count for pagination
    const total = await Wilaya.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: wilayas,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching wilayas:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wilayas' },
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
    const { code, name, shipping_price_home, shipping_price_desk } = body;

    // Validation
    if (!code || !name) {
      return NextResponse.json(
        { success: false, error: 'Code and name are required' },
        { status: 400 }
      );
    }

    // Check if wilaya code already exists
    const existing = await Wilaya.findOne({ code });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Wilaya code already exists' },
        { status: 400 }
      );
    }

    // Create wilaya
    const wilaya = await Wilaya.create({
      code,
      name,
      shipping_price_home: shipping_price_home || 0,
      shipping_price_desk: shipping_price_desk || 0,
    });

    return NextResponse.json({
      success: true,
      data: wilaya,
      message: 'Wilaya created successfully',
    });
  } catch (error) {
    console.error('Error creating wilaya:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create wilaya' },
      { status: 500 }
    );
  }
}
