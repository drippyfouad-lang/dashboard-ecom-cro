'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/hooks/useToast';
import {
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

export default function SentOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const toast = useToast();

  useEffect(() => {
    fetchSentOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery]);

  // Auto-sync every 5 minutes for visible orders (as per engineering spec)
  useEffect(() => {
    const autoSyncInterval = setInterval(() => {
      if (!syncing && orders.length > 0) {
        console.log('[Anderson Sent] Auto-syncing order statuses...');
        handleSyncStatuses();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(autoSyncInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, syncing]);

  const fetchSentOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/orders/anderson/sent?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data);
        setTotalPages(data.pagination.pages);
      } else {
        toast.error('Failed to fetch sent orders');
      }
    } catch (error) {
      console.error('Error fetching sent orders:', error);
      toast.error('Failed to fetch sent orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncStatuses = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/orders/anderson/sync-statuses', {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        const { updated, failed } = data.data;
        
        if (updated > 0) {
          toast.success(`Synchronized ${updated} order(s) successfully`);
          fetchSentOrders(); // Refresh list
        } else if (failed === 0) {
          toast.success('All orders are up to date');
        } else {
          toast.error(`Failed to sync ${failed} order(s)`);
        }
      } else {
        toast.error(data.error || 'Failed to sync statuses');
      }
    } catch (error) {
      console.error('Error syncing statuses:', error);
      toast.error('Failed to sync statuses');
    } finally {
      setSyncing(false);
    }
  };

  const filteredOrders = searchQuery
    ? orders.filter(order =>
        order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.ecotrack_tracking_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_phone?.includes(searchQuery)
      )
    : orders;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sent Orders</h1>
            <p className="text-sm text-gray-500 mt-1">
              Orders expediated to EcoTrack
            </p>
          </div>
          <button
            onClick={handleSyncStatuses}
            disabled={syncing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ArrowPathIcon className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Statuses'}
          </button>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number, tracking number, or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-gray-500">Loading sent orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <PaperAirplaneIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Sent Orders</h3>
            <p className="text-gray-500">No orders have been expediated yet</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tracking
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Expediated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrders.map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-900">
                            {order.order_number || `#${order._id.slice(-8)}`}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <PaperAirplaneIcon className="w-4 h-4 text-indigo-500" />
                            <span className="text-xs text-indigo-700 font-medium">Sent</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            {order.ecotrack_tracking_number ? (
                              <>
                                <div className="font-medium text-gray-900">
                                  {order.ecotrack_tracking_number}
                                </div>
                                <div className="text-xs text-gray-500">
                                  EcoTrack ID: {order.ecotrack_order_id}
                                </div>
                              </>
                            ) : (
                              <span className="text-gray-500">No tracking number</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{order.customer_name}</div>
                            <div className="text-gray-500">{order.customer_phone}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {order.wilaya_id?.name || 'N/A'}
                          </div>
                          {order.commune_id && (
                            <div className="text-xs text-gray-500">{order.commune_id.name}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-gray-900">
                            {order.total?.toLocaleString()} DZD
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {order.expedition_date ? new Date(order.expedition_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
