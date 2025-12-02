import dbConnect from '@/lib/mongodb';
import UserActivity from '@/lib/models/UserActivity';

/**
 * Activity Logger Utility
 * Logs user actions throughout the dashboard for tracking and analytics
 */

/**
 * Log user activity
 * @param {Object} data - Activity data
 * @param {string} data.userId - User ID
 * @param {string} data.actionType - Type of action (login, create, update, delete, etc.)
 * @param {string} data.resource - Resource affected (product, order, user, etc.)
 * @param {string} data.resourceId - ID of the resource (optional)
 * @param {Object} data.details - Additional details (optional)
 * @param {Object} req - Request object (optional, for IP and user agent)
 */
export async function logActivity({
  userId,
  actionType,
  resource,
  resourceId = null,
  details = {},
  req = null,
}) {
  try {
    await dbConnect();

    const activityData = {
      user_id: userId,
      action_type: actionType,
      resource,
      resource_id: resourceId,
      details,
    };

    // Extract IP and user agent from request if available
    if (req) {
      activityData.ip_address =
        req.headers['x-forwarded-for'] ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        'unknown';
      activityData.user_agent = req.headers['user-agent'] || 'unknown';
    }

    const activity = await UserActivity.create(activityData);
    return activity;
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to prevent breaking the main flow
    return null;
  }
}

/**
 * Get user activities with pagination and filters
 */
export async function getUserActivities({
  userId = null,
  actionType = null,
  resource = null,
  startDate = null,
  endDate = null,
  page = 1,
  limit = 50,
}) {
  try {
    await dbConnect();

    const query = {};

    if (userId) query.user_id = userId;
    if (actionType) query.action_type = actionType;
    if (resource) query.resource = resource;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      UserActivity.find(query)
        .populate('user_id', 'full_name email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserActivity.countDocuments(query),
    ]);

    return {
      activities,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    throw error;
  }
}

/**
 * Get activity statistics
 */
export async function getActivityStats(userId = null, days = 30) {
  try {
    await dbConnect();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = { timestamp: { $gte: startDate } };
    if (userId) query.user_id = userId;

    const stats = await UserActivity.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$action_type',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const resourceStats = await UserActivity.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$resource',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const totalActivities = await UserActivity.countDocuments(query);

    return {
      byAction: stats,
      byResource: resourceStats,
      total: totalActivities,
      period: `${days} days`,
    };
  } catch (error) {
    console.error('Failed to fetch activity stats:', error);
    throw error;
  }
}

/**
 * Client-side activity logger (uses API route)
 */
export async function logClientActivity(activityData) {
  try {
    await fetch('/api/activity/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activityData),
    });
  } catch (error) {
    console.error('Failed to log client activity:', error);
  }
}
