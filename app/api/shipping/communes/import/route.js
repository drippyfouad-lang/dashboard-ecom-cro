import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Commune from '@/lib/models/Commune';
import Wilaya from '@/lib/models/Wilaya';
import { getCommunes, getFees } from '@/lib/ecotrackService';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin privileges
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    await dbConnect();

    console.log('[Commune Import] Starting import from EcoTrack...');

    // Step 1: Fetch communes and fees from EcoTrack API
    const [communesResponse, feesResponse] = await Promise.all([
      getCommunes(), // Get all communes (no filter)
      getFees(),
    ]);

    if (!communesResponse.success) {
      console.error('[Commune Import] Error fetching communes:', communesResponse.error);
      
      // Check if it's a 403 Forbidden (authentication issue)
      if (communesResponse.statusCode === 403) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Authentication failed - 403 Forbidden',
            details: 'Please check your ECOTRACK_TOKEN in environment variables. The token may be invalid or missing.',
            apiUrl: process.env.ECOTRACK_API_URL || 'https://anderson-ecommerce.ecotrack.dz/api/v1',
            hasToken: !!process.env.ECOTRACK_TOKEN,
            tokenLength: process.env.ECOTRACK_TOKEN?.length || 0,
            rawError: communesResponse.error,
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch communes from EcoTrack',
          details: communesResponse.error?.message || JSON.stringify(communesResponse.error),
          statusCode: communesResponse.statusCode,
          statusText: communesResponse.statusText,
          apiUrl: process.env.ECOTRACK_API_URL || 'https://anderson-ecommerce.ecotrack.dz/api/v1',
        },
        { status: communesResponse.statusCode || 500 }
      );
    }

    if (!feesResponse.success) {
      console.error('[Commune Import] Error fetching fees:', feesResponse.error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch fees from EcoTrack',
          details: feesResponse.error.message || JSON.stringify(feesResponse.error),
          apiUrl: process.env.ECOTRACK_API_URL || 'https://anderson-ecommerce.ecotrack.dz/api/v1',
        },
        { status: 500 }
      );
    }

    const ecotrackCommunes = communesResponse.data;
    const fees = feesResponse.data;

    console.log(`[Commune Import] Fetched ${ecotrackCommunes.length} communes from EcoTrack`);
    
    if (!ecotrackCommunes || !Array.isArray(ecotrackCommunes) || ecotrackCommunes.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No communes found in EcoTrack response',
          details: 'The API returned an empty array'
        },
        { status: 400 }
      );
    }

    // Step 2: Get all wilayas from database for mapping
    const wilayas = await Wilaya.find({});
    
    if (wilayas.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No wilayas found in database',
          details: 'Please import wilayas first before importing communes.'
        },
        { status: 400 }
      );
    }
    
    // Create mapping from ecotrack_id to MongoDB _id
    const wilayaMap = {};
    wilayas.forEach(wilaya => {
      if (wilaya.ecotrack_id) {
        wilayaMap[wilaya.ecotrack_id] = wilaya._id;
      }
    });

    console.log(`[Commune Import] Loaded ${wilayas.length} wilayas for mapping`);

    // Step 3: Create a map of wilaya_id to fees (using livraison tarifs)
    const feesMap = {};
    if (fees.livraison && Array.isArray(fees.livraison)) {
      fees.livraison.forEach(fee => {
        feesMap[fee.wilaya_id] = {
          home: parseFloat(fee.tarif) || 0,
          desk: parseFloat(fee.tarif_stopdesk) || 0,
        };
      });
    }

    // Step 4: Delete all existing communes
    const deleteResult = await Commune.deleteMany({});
    console.log(`[Commune Import] Deleted ${deleteResult.deletedCount} existing communes`);

    // Step 5: Transform and filter communes with valid wilaya mapping
    const communesToImport = [];
    const skippedCommunes = [];

    for (const commune of ecotrackCommunes) {
      try {
        const wilayaEcotrackId = commune.wilaya_id;
        const wilayaId = wilayaMap[wilayaEcotrackId];

        if (wilayaId) {
          // Get pricing for this commune's wilaya
          const pricing = feesMap[wilayaEcotrackId] || { home: 0, desk: 0 };

          communesToImport.push({
            name: commune.commune_name || `Commune ${commune.commune_id}`,
            name_ar: null, // Not provided by EcoTrack
            wilaya_id: wilayaId,
            ecotrack_id: commune.commune_id,
            shipping_price_home: pricing.home,
            shipping_price_desk: pricing.desk,
            is_active: true,
            admin_added: false,
            imported_from_ecotrack: true,
            imported_at: new Date(),
          });
        } else {
          skippedCommunes.push({
            name: commune.commune_name,
            ecotrack_id: commune.commune_id,
            wilaya_id: wilayaEcotrackId,
            reason: 'Wilaya not found in database',
          });
        }
      } catch (error) {
        console.error(`[Commune Import] Error processing commune:`, error);
        skippedCommunes.push({
          name: commune.commune_name || 'Unknown',
          ecotrack_id: commune.commune_id,
          error: error.message,
        });
      }
    }

    console.log(`[Commune Import] Prepared ${communesToImport.length} communes for import`);
    console.log(`[Commune Import] Skipped ${skippedCommunes.length} communes (no wilaya mapping)`);

    if (communesToImport.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No communes could be imported',
          details: 'All communes were skipped due to missing wilaya mapping. Please import wilayas first.',
        },
        { status: 400 }
      );
    }

    // Step 6: Insert all communes
    const insertedCommunes = await Commune.insertMany(communesToImport, { ordered: false });
    console.log(`[Commune Import] Successfully imported ${insertedCommunes.length} communes`);

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedCommunes.length} communes from EcoTrack`,
      data: {
        imported: insertedCommunes.length,
        deleted: deleteResult.deletedCount,
        skipped: skippedCommunes.length,
      },
      warnings: skippedCommunes.length > 0 
        ? [`${skippedCommunes.length} communes were skipped due to missing wilaya mapping`]
        : [],
    });
  } catch (error) {
    console.error('[Commune Import] Error during import:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to import communes',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
