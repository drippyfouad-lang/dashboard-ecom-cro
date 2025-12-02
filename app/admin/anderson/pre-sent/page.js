'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/hooks/useToast';
import {
  TruckIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export default function PreSentOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expediting, setExpediting] = useState(false);
  const [sendingToEcotrack, setSendingToEcotrack] = useState(false);

  const toast = useToast();

  useEffect(() => {
    fetchPreSentOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery]);

  const fetchPreSentOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/orders/anderson/pre-sent?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data);
        setTotalPages(data.pagination.pages);
      } else {
        toast.error('Failed to fetch pre-sent orders');
      }
    } catch (error) {
      console.error('Error fetching pre-sent orders:', error);
      toast.error('Failed to fetch pre-sent orders');
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(o => o._id));
    }
  };

  const handleExpediateAll = async () => {
    if (orders.length === 0) {
      toast.error('No orders available to expediate');
      return;
    }

    const allOrderIds = orders.map(o => o._id);
    setSelectedOrders(allOrderIds);
    
    // Use the bulk expedition function
    await handleBulkExpedition(allOrderIds);
  };

  const handleBulkExpedition = async (orderIds = selectedOrders) => {
    if (orderIds.length === 0) {
      toast.error('Please select at least one order');
      return;
    }

    setExpediting(true);
    try {
      const response = await fetch('/api/orders/expediate-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      });

      const data = await response.json();
      
      if (data.success) {
        const { successful, failed } = data.data;
        
        if (successful > 0) {
          toast.success(`Successfully expediated ${successful} order(s) to EcoTrack`);
        }
        if (failed > 0) {
          toast.error(`Failed to expediate ${failed} order(s)`);
        }
        
        // Refresh list and clear selection
        setSelectedOrders([]);
        fetchPreSentOrders();
      } else {
        toast.error(data.error || 'Failed to expediate orders');
      }
    } catch (error) {
      console.error('Error expediting orders:', error);
      toast.error('Failed to expediate orders');
    } finally {
      setExpediting(false);
    }
  };

  const handleSendToEcotrack = async (orderIds = selectedOrders) => {
    if (orderIds.length === 0) {
      toast.error('Please select at least one order');
      return;
    }

    if (orderIds.length > 100) {
      toast.error('Maximum 100 orders per request');
      return;
    }

    setSendingToEcotrack(true);
    try {
      const response = await fetch('/api/orders/anderson/send-to-ecotrack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      });

      const data = await response.json();
      
      if (data.success) {
        const { successful, failed } = data.data;
        
        toast.success(
          `✅ ${successful.length} orders sent to EcoTrack successfully!`
        );
        
        if (failed.length > 0) {
          toast.error(
            `❌ ${failed.length} orders failed. Check console for details.`
          );
          console.error('Failed orders:', failed);
        }
        
        // Show tracking numbers for successful orders
        if (successful.length > 0) {
          console.log('Tracking numbers:', successful);
        }
        
        // Refresh list and clear selection
        setSelectedOrders([]);
        fetchPreSentOrders();
      } else {
        toast.error(data.error || 'Failed to send orders to EcoTrack');
        if (data.details) {
          console.error('Error details:', data.details);
        }
      }
    } catch (error) {
      console.error('Error sending to EcoTrack:', error);
      toast.error('Failed to send orders to EcoTrack');
    } finally {
      setSendingToEcotrack(false);
    }
  };

  const filteredOrders = searchQuery
    ? orders.filter(order =>
        order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
            <h1 className="text-2xl font-bold text-gray-900">Pre-Sent Orders</h1>
            <p className="text-sm text-gray-500 mt-1">
              Confirmed orders ready for expedition to EcoTrack
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSendToEcotrack}
              disabled={selectedOrders.length === 0 || sendingToEcotrack}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <TruckIcon className="w-5 h-5" />
              {sendingToEcotrack ? 'Sending...' : `Send to EcoTrack (${selectedOrders.length})`}
            </button>
            <button
              onClick={handleBulkExpedition}
              disabled={selectedOrders.length === 0 || expediting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <TruckIcon className="w-5 h-5" />
              {expediting ? 'Expediting...' : `Expediate Selected (${selectedOrders.length})`}
            </button>
            <button
              onClick={handleExpediateAll}
              disabled={orders.length === 0 || expediting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <TruckIcon className="w-5 h-5" />
              {expediting ? 'Expediting...' : `Expediate All (${orders.length})`}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number, customer name, or phone..."
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
            <p className="mt-2 text-gray-500">Loading pre-sent orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <TruckIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Pre-Sent Orders</h3>
            <p className="text-gray-500">No confirmed orders ready for expedition</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedOrders.length === filteredOrders.length}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Order
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
                        Confirmed
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrders.map((order) => (
                      <tr
                        key={order._id}
                        className={`hover:bg-gray-50 ${selectedOrders.includes(order._id) ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order._id)}
                            onChange={() => toggleOrderSelection(order._id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-900">
                            {order.order_number || `#${order._id.slice(-8)}`}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                            <span className="text-xs text-green-700 font-medium">Confirmed</span>
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
                          {order.confirmed_at ? new Date(order.confirmed_at).toLocaleDateString('en-US', {
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
