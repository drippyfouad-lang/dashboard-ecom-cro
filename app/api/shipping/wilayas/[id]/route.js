import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Wilaya from '@/lib/models/Wilaya';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { id } = params;

    const wilaya = await Wilaya.findById(id);

    if (!wilaya) {
      return NextResponse.json({ success: false, error: 'Wilaya not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: wilaya,
    });
  } catch (error) {
    console.error('Error fetching wilaya:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wilaya' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { id } = params;
    const body = await request.json();

    // Check if wilaya exists
    const existing = await Wilaya.findById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Wilaya not found' }, { status: 404 });
    }

    // If code is being changed, check for duplicates
    if (body.code && body.code !== existing.code) {
      const duplicate = await Wilaya.findOne({ code: body.code });
      if (duplicate) {
        return NextResponse.json(
          { success: false, error: 'Wilaya code already exists' },
          { status: 400 }
        );
      }
    }

    // Update wilaya
    const updatedWilaya = await Wilaya.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      data: updatedWilaya,
      message: 'Wilaya updated successfully',
    });
  } catch (error) {
    console.error('Error updating wilaya:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update wilaya' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { id } = params;

    // Check if wilaya exists
    const wilaya = await Wilaya.findById(id);
    if (!wilaya) {
      return NextResponse.json({ success: false, error: 'Wilaya not found' }, { status: 404 });
    }

    // Delete wilaya
    await Wilaya.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Wilaya deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting wilaya:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete wilaya' },
      { status: 500 }
    );
  }
}
