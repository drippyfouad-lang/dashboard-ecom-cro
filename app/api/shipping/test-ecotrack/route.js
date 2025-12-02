import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getWilayas } from '@/lib/ecotrackService';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[EcoTrack Test] Testing connection...');
    console.log('[EcoTrack Test] API URL:', process.env.ECOTRACK_API_URL || 'https://anderson-ecommerce.ecotrack.dz');
    console.log('[EcoTrack Test] Token:', process.env.ECOTRACK_TOKEN ? '***' + process.env.ECOTRACK_TOKEN.slice(-8) : 'Not set');

    // Test fetching wilayas
    const response = await getWilayas();
    
    if (response.success) {
      const wilayas = response.data;
      
      return NextResponse.json({
        success: true,
        message: 'EcoTrack API connection successful',
        data: {
          wilayasCount: wilayas.length,
          sampleWilaya: wilayas[0] || null,
          apiUrl: process.env.ECOTRACK_API_URL || 'https://anderson-ecommerce.ecotrack.dz',
        }
      });
    } else {
      console.error('[EcoTrack Test] Connection failed:', response.error);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to EcoTrack API',
        details: response.error.message || JSON.stringify(response.error),
        apiUrl: process.env.ECOTRACK_API_URL || 'https://anderson-ecommerce.ecotrack.dz',
        statusCode: response.error.response?.status || null,
        responseData: response.error.response?.data || null,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[EcoTrack Test] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
