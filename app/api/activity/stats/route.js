import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Activity from '@/lib/models/Activity';

/**
 * API Route: GET /api/activity/stats
 * Fetches activity statistics
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
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all activities in date range
    const activities = await Activity.find({
      created_at: { $gte: startDate },
    }).lean();

    // Calculate statistics
    const total_count = activities.length;
    const unique_users = new Set(activities.map(a => a.user_email)).size;
    
    // Today's count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today_count = activities.filter(a => new Date(a.created_at) >= todayStart).length;

    // By action type
    const by_action_type = {};
    activities.forEach(a => {
      by_action_type[a.action_type] = (by_action_type[a.action_type] || 0) + 1;
    });

    // By resource
    const by_resource = {};
    activities.forEach(a => {
      by_resource[a.resource] = (by_resource[a.resource] || 0) + 1;
    });

    // Most active resource
    const most_active_resource = Object.entries(by_resource)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // Timeline (daily counts)
    const timeline = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const count = activities.filter(a => {
        const actDate = new Date(a.created_at);
        return actDate >= date && actDate < nextDate;
      }).length;
      
      timeline.push({
        date: date.toISOString().split('T')[0],
        count,
      });
    }

    const stats = {
      total_count,
      unique_users,
      today_count,
      most_active_resource,
      by_action_type,
      by_resource,
      timeline,
    };

    return Response.json({ success: true, data: stats });
  } catch (error) {
    console.error('Failed to fetch activity stats:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch stats', details: error.message },
      { status: 500 }
    );
  }
}
