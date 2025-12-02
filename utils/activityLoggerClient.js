/**
 * Client-side Activity Logger
 * Safe to use in client components (no MongoDB imports)
 */

/**
 * Log activity from client-side
 * @param {Object} activityData - Activity data to log
 * @param {string} activityData.actionType - Type of action
 * @param {string} activityData.resource - Resource affected
 * @param {string} activityData.resourceId - ID of the resource (optional)
 * @param {Object} activityData.details - Additional details (optional)
 */
export async function logClientActivity(activityData) {
  try {
    const response = await fetch('/api/activity/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activityData),
    });

    if (!response.ok) {
      console.warn('Activity logging failed:', response.statusText);
    }

    return response.ok;
  } catch (error) {
    // Silently fail - don't break the UI if logging fails
    console.error('Failed to log client activity:', error);
    return false;
  }
}

/**
 * Fetch user activities from client-side
 */
export async function fetchActivities(params = {}) {
  try {
    const queryParams = new URLSearchParams(params);
    const response = await fetch(`/api/activity/list?${queryParams}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch activities');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    throw error;
  }
}

/**
 * Fetch activity statistics from client-side
 */
export async function fetchActivityStats(days = 30) {
  try {
    const response = await fetch(`/api/activity/stats?days=${days}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch activity stats');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch activity stats:', error);
    throw error;
  }
}
