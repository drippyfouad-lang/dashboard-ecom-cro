import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Wilaya from '@/lib/models/Wilaya';
import { getWilayas, getFees } from '@/lib/ecotrackService';

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

    console.log('[Wilaya Import] Starting import from EcoTrack...');

    // Step 1: Fetch wilayas and fees from EcoTrack API
    const [wilayasResponse, feesResponse] = await Promise.all([
      getWilayas(),
      getFees(),
    ]);

    if (!wilayasResponse.success) {
      console.error('[Wilaya Import] Error fetching wilayas:', wilayasResponse.error);
      
      // Check if it's a 403 Forbidden (authentication issue)
      if (wilayasResponse.statusCode === 403) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Authentication failed - 403 Forbidden',
            details: 'Please check your ECOTRACK_TOKEN in environment variables. The token may be invalid or missing.',
            apiUrl: process.env.ECOTRACK_API_URL || 'https://anderson-ecommerce.ecotrack.dz/api/v1',
            hasToken: !!process.env.ECOTRACK_TOKEN,
            tokenLength: process.env.ECOTRACK_TOKEN?.length || 0,
            rawError: wilayasResponse.error,
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch wilayas from EcoTrack',
          details: wilayasResponse.error?.message || JSON.stringify(wilayasResponse.error),
          statusCode: wilayasResponse.statusCode,
          statusText: wilayasResponse.statusText,
          apiUrl: process.env.ECOTRACK_API_URL || 'https://anderson-ecommerce.ecotrack.dz/api/v1',
        },
        { status: wilayasResponse.statusCode || 500 }
      );
    }

    if (!feesResponse.success) {
      console.error('[Wilaya Import] Error fetching fees:', feesResponse.error);
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

    const ecotrackWilayas = wilayasResponse.data;
    const fees = feesResponse.data;

    console.log(`[Wilaya Import] Fetched ${ecotrackWilayas.length} wilayas from EcoTrack`);
    
    if (!ecotrackWilayas || !Array.isArray(ecotrackWilayas) || ecotrackWilayas.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No wilayas found in EcoTrack response',
          details: 'The API returned an empty array'
        },
        { status: 400 }
      );
    }

    // Step 2: Delete all existing wilayas
    const deleteResult = await Wilaya.deleteMany({});
    console.log(`[Wilaya Import] Deleted ${deleteResult.deletedCount} existing wilayas`);

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

    // Step 4: Transform and import new wilayas
    const wilayasToImport = ecotrackWilayas.map((wilaya) => {
      const wilayaId = wilaya.wilaya_id;
      const pricing = feesMap[wilayaId] || { home: 0, desk: 0 };

      return {
        name: wilaya.wilaya_name || `Wilaya ${wilayaId}`,
        name_ar: null, // Not provided by EcoTrack
        code: String(wilayaId).padStart(2, '0'), // Format as "01", "02", etc.
        ecotrack_id: wilayaId,
        shipping_price_home: pricing.home,
        shipping_price_desk: pricing.desk,
        delivery_to_home: pricing.home > 0,
        delivery_to_desk: pricing.desk > 0,
        is_active: true,
        imported_from_ecotrack: true,
        imported_at: new Date(),
      };
    });

    // Step 5: Insert all wilayas
    const insertedWilayas = await Wilaya.insertMany(wilayasToImport, { ordered: false });
    console.log(`[Wilaya Import] Successfully imported ${insertedWilayas.length} wilayas`);

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedWilayas.length} wilayas from EcoTrack`,
      data: {
        imported: insertedWilayas.length,
        deleted: deleteResult.deletedCount,
      },
    });
  } catch (error) {
    console.error('[Wilaya Import] Error during import:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to import wilayas',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
