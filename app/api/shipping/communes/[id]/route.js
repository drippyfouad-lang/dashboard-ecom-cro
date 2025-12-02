import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Commune from '@/lib/models/Commune';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { id } = params;

    const commune = await Commune.findById(id).populate('wilaya_id', 'name home_delivery_price desk_delivery_price');

    if (!commune) {
      return NextResponse.json({ success: false, error: 'Commune not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: commune,
    });
  } catch (error) {
    console.error('Error fetching commune:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch commune' },
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

    // Check if commune exists
    const existing = await Commune.findById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Commune not found' }, { status: 404 });
    }

    // Update commune
    const updatedCommune = await Commune.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).populate('wilaya_id', 'name');

    return NextResponse.json({
      success: true,
      data: updatedCommune,
      message: 'Commune updated successfully',
    });
  } catch (error) {
    console.error('Error updating commune:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update commune' },
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

    // Check if commune exists
    const commune = await Commune.findById(id);
    if (!commune) {
      return NextResponse.json({ success: false, error: 'Commune not found' }, { status: 404 });
    }

    // Delete commune
    await Commune.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Commune deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting commune:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete commune' },
      { status: 500 }
    );
  }
}
