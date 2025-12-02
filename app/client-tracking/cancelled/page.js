'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/hooks/useToast';
import {
  MagnifyingGlassIcon,
  PhoneIcon,
  CalendarIcon,
  XCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

export default function CancelledOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const toast = useToast();

  const fetchCancelledOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (searchQuery) params.append('search', searchQuery);
      if (reasonFilter) params.append('reason', reasonFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`/api/client-tracking/cancelled?${params}`);
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
  }, [page, searchQuery, reasonFilter, startDate, endDate]);

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const getReasonBadge = (reason) => {
    const reasonConfig = {
      'client-cancelled-by-phone': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Client Cancelled (Phone)' },
      'client-did-not-respond': { bg: 'bg-red-100', text: 'text-red-800', label: 'No Response' },
      'other': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Other' },
    };

    const config = reasonConfig[reason] || reasonConfig['other'];

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <XCircleIcon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cancelled Orders</h1>
          <p className="text-gray-600 mt-2">View all cancelled orders with cancellation details</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Customer
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Name, phone..."
                />
              </div>
            </div>

            {/* Reason Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Reason
              </label>
              <select
                value={reasonFilter}
                onChange={(e) => {
                  setReasonFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Reasons</option>
                <option value="client-cancelled-by-phone">Client Cancelled (Phone)</option>
                <option value="client-did-not-respond">No Response</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Start date"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="End date"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold">{orders.length}</span> cancelled orders
          </p>
        </div>

        {/* Orders Table */}
        {loading ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-gray-500">Loading cancelled orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <XCircleIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Cancelled Orders</h3>
            <p className="text-gray-500">No orders match your filters</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cancellation Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cancelled Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cancelled By</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-blue-600">
                            #{order._id.slice(-6).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {order.customer_name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" />
                            {order.customer_phone || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getReasonBadge(order.cancellation_reason)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {order.cancelled_at ? new Date(order.cancelled_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {order.cancelled_by?.name || order.cancelled_by?.email || 'System'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleViewOrder(order)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="View Details"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
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

      {/* Order Details Modal */}
      {isDetailOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Cancelled Order Details</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    #{selectedOrder._id.slice(-6).toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Cancellation Info */}
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-semibold text-red-900 mb-2">Cancellation Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-red-700">Reason:</span>
                      <span className="font-medium text-red-900">
                        {selectedOrder.cancellation_reason === 'client-cancelled-by-phone' && 'Client Cancelled (Phone)'}
                        {selectedOrder.cancellation_reason === 'client-did-not-respond' && 'No Response'}
                        {selectedOrder.cancellation_reason === 'other' && 'Other'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-700">Cancelled Date:</span>
                      <span className="font-medium text-red-900">
                        {selectedOrder.cancelled_at ? new Date(selectedOrder.cancelled_at).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-700">Cancelled By:</span>
                      <span className="font-medium text-red-900">
                        {selectedOrder.cancelled_by?.name || selectedOrder.cancelled_by?.email || 'System'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Customer & Shipping Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Customer</h3>
                    <p className="text-sm text-gray-900">{selectedOrder.customer_name || selectedOrder.customerName || 'N/A'}</p>
                    <p className="text-sm text-gray-600">{selectedOrder.customer_phone || selectedOrder.customerPhone || 'N/A'}</p>
                    {(selectedOrder.customer_email || selectedOrder.customerEmail) && (
                      <p className="text-sm text-gray-600">{selectedOrder.customer_email || selectedOrder.customerEmail}</p>
                    )}
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Delivery Location</h3>
                    <p className="text-sm text-gray-900">{selectedOrder.wilaya_id?.name || selectedOrder.wilayaId?.name || selectedOrder.wilayaName || 'N/A'}</p>
                    {(selectedOrder.commune_id || selectedOrder.communeId) && (
                      <p className="text-sm text-gray-600">{selectedOrder.commune_id?.name || selectedOrder.communeId?.name || selectedOrder.communeName}</p>
                    )}
                    {(selectedOrder.shipping_address || selectedOrder.shippingAddress) && (
                      <p className="text-sm text-gray-600 mt-1">{selectedOrder.shipping_address || selectedOrder.shippingAddress}</p>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.product_name || item.productName || 'Product'}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              Qty: {item.quantity} × {(item.price || item.unitPrice || item.unit_price || 0).toLocaleString()} DZD
                              {item.selectedSize && ` • Size: ${item.selectedSize}`}
                              {item.selectedColor && ` • Color: ${item.selectedColor}`}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {(item.total || item.totalPrice || ((item.quantity || 1) * (item.price || item.unitPrice || 0))).toLocaleString()} DZD
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-gray-900">{(selectedOrder.total || 0).toLocaleString()} DZD</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-1">Notes:</p>
                    <p className="text-sm text-blue-800">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
