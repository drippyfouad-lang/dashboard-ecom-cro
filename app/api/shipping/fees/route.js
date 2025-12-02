import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getFees } from '@/lib/ecotrackService';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Fees] Fetching fees from EcoTrack...');

    const response = await getFees();

    if (response.success) {
      return NextResponse.json({
        success: true,
        data: response.data,
      });
    } else {
      console.error('[Fees] Error:', response.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch fees from EcoTrack',
        details: response.error.message || JSON.stringify(response.error),
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Fees] Error:', error);
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
