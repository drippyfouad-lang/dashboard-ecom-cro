import { authOptions } from '@/lib/auth';
import Commune from '@/lib/models/Commune';
import Wilaya from '@/lib/models/Wilaya';
import connectDB from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

/**
 * GET /api/wilayas/[id]
 * Get a single wilaya with its communes
 */
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const wilaya = await Wilaya.findById(id).lean();

    if (!wilaya) {
      return NextResponse.json(
        { success: false, error: 'Wilaya not found' },
        { status: 404 }
      );
    }

    // Get communes for this wilaya
    const communes = await Commune.find({ wilaya_id: id })
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        ...wilaya,
        communes,
      },
    });
  } catch (error) {
    console.error('[API] Error fetching wilaya:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/wilayas/[id]
 * Update a wilaya (admin only)
 */
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await params;
    const data = await request.json();

    const wilaya = await Wilaya.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );

    if (!wilaya) {
      return NextResponse.json(
        { success: false, error: 'Wilaya not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: wilaya,
    });
  } catch (error) {
    console.error('[API] Error updating wilaya:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/wilayas/[id]
 * Delete a wilaya (admin only)
 */
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await params;

    // Check if there are any communes using this wilaya
    const communeCount = await Commune.countDocuments({ wilaya_id: id });

    if (communeCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete wilaya with ${communeCount} communes. Delete communes first.`
        },
        { status: 400 }
      );
    }

    const wilaya = await Wilaya.findByIdAndDelete(id);

    if (!wilaya) {
      return NextResponse.json(
        { success: false, error: 'Wilaya not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Wilaya deleted successfully',
    });
  } catch (error) {
    console.error('[API] Error deleting wilaya:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
