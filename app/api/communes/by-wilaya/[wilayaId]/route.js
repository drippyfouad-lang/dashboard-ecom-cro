import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Commune from '@/lib/models/Commune';

/**
 * GET /api/communes/by-wilaya/[wilayaId]
 * Get all communes for a specific wilaya
 */
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { wilayaId } = params;

    const communes = await Commune.find({ 
      wilaya_id: wilayaId,
      is_active: true 
    })
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
