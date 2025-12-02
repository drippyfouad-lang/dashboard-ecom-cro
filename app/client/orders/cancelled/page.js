'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/hooks/useToast';
import {
  XCircleIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

export default function CancelledOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const toast = useToast();

  const fetchCancelledOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`/api/orders/client/cancelled?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data);
        setTotalPages(data.pagination.pages);
      } else {
        toast.error('Failed to fetch cancelled orders');
      }
    } catch (error) {
      console.error('Error fetching cancelled orders:', error);
      toast.error('Failed to fetch cancelled orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCancelledOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, startDate, endDate]);

  const handleSearch = () => {
    setPage(1);
    fetchCancelledOrders();
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setPage(1);
  };

  const getCancellationReasonLabel = (reason) => {
    const labels = {
      'client-cancelled-by-phone': 'Cancelled by Client',
      'client-did-not-respond': 'Client Did Not Respond',
      'other': 'Other Reason',
    };
    return labels[reason] || 'Cancelled';
  };

  const filteredOrders = searchQuery
    ? orders.filter(order =>
        order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_phone?.includes(searchQuery)
      )
    : orders;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cancelled Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            View your cancelled order history
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by order number or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply
                </button>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-gray-500">Loading cancelled orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <XCircleIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Cancelled Orders</h3>
            <p className="text-gray-500">You don&apos;t have any cancelled orders</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div key={order._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.order_number || order._id.slice(-8)}
                      </h3>
                      <div className="flex flex-col gap-1 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          <span>
                            Ordered: {new Date(order.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <XCircleIcon className="w-4 h-4 text-red-500" />
                          <span>
                            Cancelled: {new Date(order.cancelled_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        <XCircleIcon className="w-4 h-4 mr-1.5" />
                        Cancelled
                      </span>
                      <span className="text-xs text-gray-500">
                        {getCancellationReasonLabel(order.cancellation_reason)}
                      </span>
                    </div>
                  </div>

                  {/* Cancelled By Info */}
                  {order.cancelled_by && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        Cancelled by: <span className="font-medium">
                          {order.cancelled_by.role === 'admin' ? 'Admin' : 'You'}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="space-y-2 mb-4">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      {item.product_image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={item.product_image}
                            alt={item.product_name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.product_name}</p>
                          <p className="text-gray-500">
                            Qty: {item.quantity} × {item.unit_price} DZD
                            {item.selected_size && ` • Size: ${item.selected_size}`}
                            {item.selected_color && ` • Color: ${item.selected_color}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Details */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Delivery Location</p>
                        <p className="text-sm font-medium text-gray-900">
                          {order.wilaya_id?.name}
                          {order.commune_id && ` - ${order.commune_id.name}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Amount</p>
                        <p className="text-lg font-bold text-gray-900">{order.total} DZD</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
