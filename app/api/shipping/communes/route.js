import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Commune from '@/lib/models/Commune';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';
    const wilaya = searchParams.get('wilaya');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};

    if (wilaya) {
      filter.wilaya_id = wilaya;
    }

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    // If all=true, return all communes without pagination
    if (all) {
      const communes = await Commune.find(filter).populate('wilaya_id', 'name').sort({ name: 1 });
      return NextResponse.json({
        success: true,
        data: communes,
      });
    }

    // Get communes with pagination
    const communes = await Commune.find(filter)
      .populate('wilaya_id', 'name')
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Commune.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: communes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching communes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch communes' },
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
    const { wilaya_id, name, shipping_price_home, shipping_price_desk } = body;

    // Validation
    if (!wilaya_id || !name) {
      return NextResponse.json(
        { success: false, error: 'Wilaya ID and name are required' },
        { status: 400 }
      );
    }

    // Create commune
    const commune = await Commune.create({
      wilaya_id,
      name,
      shipping_price_home,
      shipping_price_desk,
    });

    const populatedCommune = await Commune.findById(commune._id).populate('wilaya_id', 'name');

    return NextResponse.json({
      success: true,
      data: populatedCommune,
      message: 'Commune created successfully',
    });
  } catch (error) {
    console.error('Error creating commune:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create commune' },
      { status: 500 }
    );
  }
}
