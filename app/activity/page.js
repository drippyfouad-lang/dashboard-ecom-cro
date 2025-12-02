'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/hooks/useToast';
import {
  ChartBarIcon,
  ClockIcon,
  UserIcon,
  FunnelIcon,
  ArrowPathIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { format, subDays } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ActivityPage() {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    action_type: '',
    resource: '',
    user_email: '',
    start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  const toast = useToast();

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.action_type && { action_type: filters.action_type }),
        ...(filters.resource && { resource: filters.resource }),
        ...(filters.user_email && { user_email: filters.user_email }),
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
      });

      const response = await fetch(`/api/activity/list?${params}`);
      const data = await response.json();

      if (data.success) {
        // Ensure activities is always an array
        setActivities(Array.isArray(data.data) ? data.data : []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setActivities([]);
        toast.error(data.error || 'Failed to fetch activities');
      }
    } catch (error) {
      setActivities([]);
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const days = Math.ceil(
        (new Date(filters.end_date) - new Date(filters.start_date)) / (1000 * 60 * 60 * 24)
      );
      
      const response = await fetch(`/api/activity/stats?days=${days}`);
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      toast.error('Failed to load activity stats');
    }
  };

  useEffect(() => {
    fetchActivities();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.page]);

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, page: 1 });
  };

  const handleClearFilters = () => {
    setFilters({
      action_type: '',
      resource: '',
      user_email: '',
      start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      end_date: format(new Date(), 'yyyy-MM-dd'),
    });
    setPagination({ ...pagination, page: 1 });
  };

  // Chart data preparation
  const getActivityOverTimeData = () => {
    if (!stats || !stats.timeline) return null;

    const labels = stats.timeline.map(item => format(new Date(item.date), 'MMM dd'));
    const counts = stats.timeline.map(item => item.count);

    return {
      labels,
      datasets: [
        {
          label: 'Activities',
          data: counts,
          fill: true,
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderColor: 'rgb(99, 102, 241)',
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  };

  const getActionTypeData = () => {
    if (!stats || !stats.by_action_type) return null;

    const labels = Object.keys(stats.by_action_type);
    const values = Object.values(stats.by_action_type);

    return {
      labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
      datasets: [
        {
          label: 'Actions',
          data: values,
          backgroundColor: [
            'rgba(99, 102, 241, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(236, 72, 153, 0.8)',
          ],
        },
      ],
    };
  };

  const getResourceData = () => {
    if (!stats || !stats.by_resource) return null;

    const labels = Object.keys(stats.by_resource);
    const values = Object.values(stats.by_resource);

    return {
      labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
      datasets: [
        {
          label: 'Resources',
          data: values,
          backgroundColor: [
            'rgba(99, 102, 241, 0.7)',
            'rgba(16, 185, 129, 0.7)',
            'rgba(245, 158, 11, 0.7)',
            'rgba(239, 68, 68, 0.7)',
            'rgba(139, 92, 246, 0.7)',
            'rgba(236, 72, 153, 0.7)',
            'rgba(59, 130, 246, 0.7)',
            'rgba(249, 115, 22, 0.7)',
          ],
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            family: 'Poppins, sans-serif',
            size: 12,
          },
        },
      },
      tooltip: {
        titleFont: {
          family: 'Poppins, sans-serif',
        },
        bodyFont: {
          family: 'Poppins, sans-serif',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            family: 'Poppins, sans-serif',
          },
        },
      },
      x: {
        ticks: {
          font: {
            family: 'Poppins, sans-serif',
          },
        },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: {
            family: 'Poppins, sans-serif',
            size: 11,
          },
          padding: 15,
        },
      },
      tooltip: {
        titleFont: {
          family: 'Poppins, sans-serif',
        },
        bodyFont: {
          family: 'Poppins, sans-serif',
        },
      },
    },
  };

  const getActionIcon = (actionType) => {
    const icons = {
      view: '👁️',
      create: '➕',
      update: '✏️',
      delete: '🗑️',
      export: '📥',
      login: '🔐',
      logout: '🚪',
      status_change: '🔄',
      payment_update: '💰',
      upload: '📤',
      download: '📦',
    };
    return icons[actionType] || '📋';
  };

  const getActionColor = (actionType) => {
    const colors = {
      view: 'text-blue-600 bg-blue-100',
      create: 'text-green-600 bg-green-100',
      update: 'text-yellow-600 bg-yellow-100',
      delete: 'text-red-600 bg-red-100',
      export: 'text-purple-600 bg-purple-100',
      login: 'text-indigo-600 bg-indigo-100',
      logout: 'text-gray-600 bg-gray-100',
      status_change: 'text-cyan-600 bg-cyan-100',
      payment_update: 'text-emerald-600 bg-emerald-100',
      upload: 'text-orange-600 bg-orange-100',
      download: 'text-pink-600 bg-pink-100',
    };
    return colors[actionType] || 'text-gray-600 bg-gray-100';
  };

  const formatActionLabel = (actionType) => {
    if (!actionType) return 'Unknown';
    return actionType
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const getUserDisplay = (activity) => {
    const name = activity.user_name || activity.user_id?.name || activity.user_email || 'Unknown user';
    const email = activity.user_email || activity.user_id?.email || '';
    return { name, email };
  };

  const formatDetails = (activity) => {
    if (!activity?.details || Object.keys(activity.details).length === 0) {
      return 'No additional details';
    }

    const { summary, ...rest } = activity.details;
    const segments = [];

    if (summary) {
      segments.push(summary);
    }

    Object.entries(rest).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      const label = key.replace(/_/g, ' ');
      if (typeof value === 'number') {
        segments.push(`${label}: ${value.toLocaleString()}`);
      } else if (Array.isArray(value)) {
        segments.push(`${label}: ${value.join(', ')}`);
      } else if (typeof value === 'object') {
        segments.push(`${label}: ${JSON.stringify(value)}`);
      } else {
        segments.push(`${label}: ${value}`);
      }
    });

    return segments.join(' • ') || 'No additional details';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Activity Log
          </h1>
          <p className="text-gray-600 flex items-center gap-2">
            <ClockIcon className="w-4 h-4" />
            Track all user actions and system events in real-time
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <FunnelIcon className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action Type
              </label>
              <select
                value={filters.action_type}
                onChange={(e) => handleFilterChange('action_type', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Actions</option>
                <option value="view">View</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="export">Export</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="status_change">Status Change</option>
                <option value="payment_update">Payment Update</option>
                <option value="upload">Upload</option>
                <option value="download">Download</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resource
              </label>
              <select
                value={filters.resource}
                onChange={(e) => handleFilterChange('resource', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Resources</option>
                <option value="order">Order</option>
                <option value="product">Product</option>
                <option value="category">Category</option>
                <option value="user">User</option>
                <option value="customer">Customer</option>
                <option value="shipping">Shipping</option>
                <option value="finance">Finance</option>
                <option value="dashboard">Dashboard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleClearFilters}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-100 text-sm font-medium">Total Activities</span>
                <ChartBarIcon className="w-6 h-6 text-blue-100" />
              </div>
              <p className="text-3xl font-bold">{stats.total_count || 0}</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-100 text-sm font-medium">Active Users</span>
                <UserIcon className="w-6 h-6 text-green-100" />
              </div>
              <p className="text-3xl font-bold">{stats.unique_users || 0}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-100 text-sm font-medium">Today&apos;s Activities</span>
                <CalendarIcon className="w-6 h-6 text-purple-100" />
              </div>
              <p className="text-3xl font-bold">{stats.today_count || 0}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-orange-100 text-sm font-medium">Most Active Resource</span>
                <ChartBarIcon className="w-6 h-6 text-orange-100" />
              </div>
              <p className="text-xl font-bold truncate">{stats.most_active_resource || 'N/A'}</p>
            </div>
          </div>
        )}

        {/* Charts */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Activity Over Time */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Over Time</h2>
              <div className="h-80">
                {getActivityOverTimeData() ? (
                  <Line data={getActivityOverTimeData()} options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No data available
                  </div>
                )}
              </div>
            </div>

            {/* Action Types Distribution */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Action Types</h2>
              <div className="h-80">
                {getActionTypeData() ? (
                  <Pie data={getActionTypeData()} options={pieOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No data available
                  </div>
                )}
              </div>
            </div>

            {/* Resources Distribution */}
            <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Resources Activity</h2>
              <div className="h-80">
                {getResourceData() ? (
                  <Bar data={getResourceData()} options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No data available
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Activity Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activities</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No activities found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resource
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activities.map((activity) => (
                      <tr key={activity._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getActionColor(activity.action_type)}`}>
                            <span>{getActionIcon(activity.action_type)}</span>
                            {formatActionLabel(activity.action_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {activity.entity_name || activity.details?.entityName || activity.resource}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {activity.resource}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const { name, email } = getUserDisplay(activity);
                            return (
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">{name}</div>
                                {email && <div className="text-gray-500 text-xs">{email}</div>}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 max-w-md whitespace-pre-line">
                            {formatDetails(activity)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(activity.created_at), 'MMM dd, HH:mm')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex justify-center items-center gap-4 p-6 border-t border-gray-100">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-gray-600">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.pages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
