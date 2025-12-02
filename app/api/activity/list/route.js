import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Activity from '@/lib/models/Activity';

/**
 * API Route: GET /api/activity/list
 * Fetches user activities with filters
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Admin-only access
    if (session.user.role?.toLowerCase() !== 'admin') {
      return Response.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const action_type = searchParams.get('action_type');
    const resource = searchParams.get('resource');
    const user_email = searchParams.get('user_email');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    const query = {};
    if (action_type) query.action_type = action_type;
    if (resource) query.resource = resource;
    if (user_email) query.user_email = new RegExp(user_email, 'i');
    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) query.created_at.$gte = new Date(start_date);
      if (end_date) {
        const endDateTime = new Date(end_date);
        endDateTime.setHours(23, 59, 59, 999);
        query.created_at.$lte = endDateTime;
      }
    }

    const skip = (page - 1) * limit;

    // Fetch activities
    const [activities, total] = await Promise.all([
      Activity.find(query)
        .populate('user_id', 'name email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Activity.countDocuments(query),
    ]);

    return Response.json({
      success: true,
      data: activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch activities', details: error.message },
      { status: 500 }
    );
  }
}
