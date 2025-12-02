import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Wilaya from '@/lib/models/Wilaya';
import Commune from '@/lib/models/Commune';
import ecotrackService from '@/lib/services/ecotrack.service';

/**
 * GET /api/wilayas
 * List all wilayas with optional filtering and search
 */
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const deliveryType = searchParams.get('deliveryType'); // 'home' or 'desk'
    const activeOnly = searchParams.get('activeOnly') === 'true';

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { name_ar: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    if (deliveryType === 'home') {
      query.delivery_to_home = true;
    } else if (deliveryType === 'desk') {
      query.delivery_to_desk = true;
    }

    if (activeOnly) {
      query.is_active = true;
    }

    const wilayas = await Wilaya.find(query)
      .sort({ code: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: wilayas,
      total: wilayas.length,
    });
  } catch (error) {
    console.error('[API] Error fetching wilayas:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wilayas
 * Create a new wilaya (admin only)
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const data = await request.json();

    const wilaya = await Wilaya.create(data);

    return NextResponse.json({
      success: true,
      data: wilaya,
    }, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating wilaya:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

/**
 * PUT /api/wilayas
 * Bulk update wilayas (admin only)
 */
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { updates } = await request.json();

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: 'Updates must be an array' },
        { status: 400 }
      );
    }

    const results = [];
    for (const update of updates) {
      const { _id, ...data } = update;
      const wilaya = await Wilaya.findByIdAndUpdate(_id, data, { new: true });
      results.push(wilaya);
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('[API] Error updating wilayas:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
