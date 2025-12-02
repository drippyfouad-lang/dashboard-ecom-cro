import dbConnect from '@/lib/mongodb';
import Commune from '@/lib/models/Commune';
import Wilaya from '@/lib/models/Wilaya';

/**
 * POST /api/shipping/communes/bulk
 * Bulk insert communes
 */
export async function POST(request) {
  try {
    await dbConnect();

    const { communes } = await request.json();

    if (!Array.isArray(communes) || communes.length === 0) {
      return Response.json({
        success: false,
        error: 'Invalid data: communes array is required'
      }, { status: 400 });
    }

    // Validate that all communes have required fields
    const invalidCommunes = communes.filter(c => !c.name || !c.wilaya_id);
    if (invalidCommunes.length > 0) {
      return Response.json({
        success: false,
        error: 'Some communes are missing required fields (name, wilaya_id)'
      }, { status: 400 });
    }

    // Verify wilaya exists
    const wilayaId = communes[0].wilaya_id;
    const wilayaExists = await Wilaya.findById(wilayaId);
    if (!wilayaExists) {
      return Response.json({
        success: false,
        error: 'Wilaya not found'
      }, { status: 404 });
    }

    // Insert all communes
    const insertedCommunes = await Commune.insertMany(communes, { ordered: false });

    return Response.json({
      success: true,
      data: insertedCommunes,
      message: `Successfully added ${insertedCommunes.length} communes`
    });

  } catch (error) {
    console.error('Error bulk creating communes:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return Response.json({
        success: false,
        error: 'Some communes already exist'
      }, { status: 400 });
    }

    return Response.json({
      success: false,
      error: error.message || 'Failed to create communes'
    }, { status: 500 });
  }
}
