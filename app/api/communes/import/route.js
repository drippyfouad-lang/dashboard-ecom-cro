import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Commune from '@/lib/models/Commune';
import Wilaya from '@/lib/models/Wilaya';
import ecotrackService from '@/lib/services/ecotrack.service';

/**
 * POST /api/communes/import
 * Import all communes from EcoTrack (admin only)
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

    console.log('[Import] Starting commune import from EcoTrack...');

    // First, ensure wilayas are imported
    const wilayasCount = await Wilaya.countDocuments({ imported_from_ecotrack: true });
    if (wilayasCount === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Please import wilayas first before importing communes' 
        },
        { status: 400 }
      );
    }

    // Fetch communes from EcoTrack
    const ecotrackCommunes = await ecotrackService.getCommunes();
    
    if (!ecotrackCommunes || ecotrackCommunes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No communes found in EcoTrack API' },
        { status: 404 }
      );
    }

    console.log(`[Import] Received ${ecotrackCommunes.length} communes from EcoTrack`);

    // Delete all existing communes
    const deleteResult = await Commune.deleteMany({});
    console.log(`[Import] Deleted ${deleteResult.deletedCount} existing communes`);

    // Get all wilayas for mapping
    const allWilayas = await Wilaya.find({}).lean();
    const wilayaMap = new Map();
    
    // Create maps for both ecotrack_id and code
    allWilayas.forEach(wilaya => {
      if (wilaya.ecotrack_id) {
        wilayaMap.set(wilaya.ecotrack_id, wilaya._id);
      }
      wilayaMap.set(wilaya.code?.toString(), wilaya._id);
    });

    console.log(`[Import] Created mapping for ${wilayaMap.size} wilayas`);

    // Prepare communes for bulk insert
    const communesToInsert = [];
    let skippedCount = 0;

    for (const commune of ecotrackCommunes) {
      // Try to find wilaya by ecotrack_id or code
      let wilayaId = wilayaMap.get(commune.wilaya_id?.toString()) ||
                     wilayaMap.get(commune.wilaya_code?.toString());

      if (!wilayaId) {
        console.warn(`[Import] Skipping commune ${commune.name} - wilaya not found (wilaya_id: ${commune.wilaya_id})`);
        skippedCount++;
        continue;
      }

      communesToInsert.push({
        name: commune.name || commune.name_fr,
        name_ar: commune.name_ar,
        code: commune.code,
        wilaya_id: wilayaId,
        ecotrack_id: commune.id?.toString(),
        is_active: true,
        admin_added: false,
        imported_from_ecotrack: true,
        imported_at: new Date(),
      });
    }

    // Bulk insert
    const insertedCommunes = await Commune.insertMany(communesToInsert);
    console.log(`[Import] Inserted ${insertedCommunes.length} new communes`);
    console.log(`[Import] Skipped ${skippedCount} communes (no matching wilaya)`);

    return NextResponse.json({
      success: true,
      message: 'Communes imported successfully from EcoTrack',
      data: {
        deleted: deleteResult.deletedCount,
        imported: insertedCommunes.length,
        skipped: skippedCount,
      },
    });
  } catch (error) {
    console.error('[Import] Error importing communes:', error);
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
