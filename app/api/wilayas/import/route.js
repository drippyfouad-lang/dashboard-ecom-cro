import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Wilaya from '@/lib/models/Wilaya';
import Commune from '@/lib/models/Commune';
import ecotrackService from '@/lib/services/ecotrack.service';

/**
 * POST /api/wilayas/import
 * Import all wilayas from EcoTrack (admin only)
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    await connectDB();

    console.log('[Import] Starting wilaya import from EcoTrack...');

    // Fetch wilayas from EcoTrack
    const ecotrackWilayas = await ecotrackService.getWilayas();
    
    if (!ecotrackWilayas || ecotrackWilayas.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No wilayas found in EcoTrack API' },
        { status: 404 }
      );
    }

    console.log(`[Import] Received ${ecotrackWilayas.length} wilayas from EcoTrack`);

    // Delete all existing wilayas
    const deleteResult = await Wilaya.deleteMany({});
    console.log(`[Import] Deleted ${deleteResult.deletedCount} existing wilayas`);

    // Also delete all communes since they reference wilayas
    const deleteCommunesResult = await Commune.deleteMany({});
    console.log(`[Import] Deleted ${deleteCommunesResult.deletedCount} existing communes`);

    // Prepare wilayas for bulk insert
    const wilayasToInsert = ecotrackWilayas.map(wilaya => ({
      name: wilaya.name || wilaya.name_fr,
      name_ar: wilaya.name_ar,
      code: parseInt(wilaya.code) || parseInt(wilaya.wilaya_code),
      ecotrack_id: wilaya.id?.toString(),
      delivery_to_home: wilaya.delivery_to_home !== false,
      delivery_to_desk: wilaya.delivery_to_desk !== false,
      shipping_price_home: parseFloat(wilaya.home_delivery_fee) || 0,
      shipping_price_desk: parseFloat(wilaya.desk_delivery_fee) || 0,
      is_active: true,
      imported_from_ecotrack: true,
      imported_at: new Date(),
    }));

    // Bulk insert
    const insertedWilayas = await Wilaya.insertMany(wilayasToInsert);
    console.log(`[Import] Inserted ${insertedWilayas.length} new wilayas`);

    return NextResponse.json({
      success: true,
      message: 'Wilayas imported successfully from EcoTrack',
      data: {
        deleted: deleteResult.deletedCount,
        imported: insertedWilayas.length,
        wilayas: insertedWilayas,
      },
    });
  } catch (error) {
    console.error('[Import] Error importing wilayas:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: error.response?.data || error.stack,
      },
      { status: 500 }
    );
  }
}
