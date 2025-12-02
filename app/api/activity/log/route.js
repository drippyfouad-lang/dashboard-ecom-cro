import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Activity from '@/lib/models/Activity';

/**
 * API Route: POST /api/activity/log
 * Logs user activity from client-side
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { actionType, resource, resourceId, details, entityName } = await req.json();

    if (!actionType || !resource) {
      return Response.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get IP address
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';

    // Create activity log
    const activity = await Activity.create({
      user_id: session.user.id,
      user_email: session.user.email,
      user_name: session.user.name || '',
      action_type: actionType,
      resource: resource,
      resource_id: resourceId || null,
      details: details || {},
      entity_name: entityName || details?.entityName || '',
      ip_address: ip,
      user_agent: req.headers.get('user-agent') || 'unknown',
    });

    return Response.json({ 
      success: true, 
      data: activity 
    });
  } catch (error) {
    console.error('Activity log error:', error);
    return Response.json(
      { success: false, error: 'Failed to log activity', details: error.message },
      { status: 500 }
    );
  }
}
