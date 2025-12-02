import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Commune from '@/lib/models/Commune';
import Wilaya from '@/lib/models/Wilaya';

/**
 * GET /api/communes
 * List all communes with optional filtering
 */
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    // Accept both 'wilaya' and 'wilayaId' for backwards compatibility
    const wilayaId = searchParams.get('wilayaId') || searchParams.get('wilaya');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { name_ar: { $regex: search, $options: 'i' } },
      ];
    }

    if (wilayaId) {
      query.wilaya_id = wilayaId;
    }

    if (activeOnly) {
      query.is_active = true;
    }

    const communes = await Commune.find(query)
      .populate('wilaya_id', 'name name_ar code')
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: communes,
      total: communes.length,
    });
  } catch (error) {
    console.error('[API] Error fetching communes:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/communes
 * Create a new commune (admin only)
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

    // Verify wilaya exists
    const wilaya = await Wilaya.findById(data.wilaya_id);
    if (!wilaya) {
      return NextResponse.json(
        { success: false, error: 'Wilaya not found' },
        { status: 404 }
      );
    }

    const commune = await Commune.create(data);

    return NextResponse.json({
      success: true,
      data: commune,
    }, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating commune:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
