import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Commune from '@/lib/models/Commune';

/**
 * GET /api/communes/[id]
 * Get a single commune
 */
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = params;
    const commune = await Commune.findById(id)
      .populate('wilaya_id', 'name name_ar code')
      .lean();

    if (!commune) {
      return NextResponse.json(
        { success: false, error: 'Commune not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: commune,
    });
  } catch (error) {
    console.error('[API] Error fetching commune:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/communes/[id]
 * Update a commune (admin only)
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

    const { id } = params;
    const data = await request.json();

    const commune = await Commune.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );

    if (!commune) {
      return NextResponse.json(
        { success: false, error: 'Commune not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: commune,
    });
  } catch (error) {
    console.error('[API] Error updating commune:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/communes/[id]
 * Delete a commune (admin only)
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

    const { id } = params;
    const commune = await Commune.findByIdAndDelete(id);

    if (!commune) {
      return NextResponse.json(
        { success: false, error: 'Commune not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Commune deleted successfully',
    });
  } catch (error) {
    console.error('[API] Error deleting commune:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
