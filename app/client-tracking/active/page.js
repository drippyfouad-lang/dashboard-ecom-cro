'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import {
  MagnifyingGlassIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

export default function ActiveOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, orderId: null, action: null });

  const toast = useToast();

  useEffect(() => {
    let isMounted = true;

    const fetchActiveOrders = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', '20');
        if (searchQuery) params.append('search', searchQuery);
        if (statusFilter) params.append('status', statusFilter);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const response = await fetch(`/api/client-tracking/active?${params}`);
        const data = await response.json();

        if (!isMounted) return;

        if (data.success) {
          setOrders(data.data);
          setTotalPages(data.pagination.pages);
        } else {
          toast.error(data.error || 'Failed to fetch active orders');
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching active orders:', error);
          toast.error('Failed to fetch active orders');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchActiveOrders();

    return () => {
      isMounted = false;
    };
  }, [page, searchQuery, statusFilter, startDate, endDate, toast]);

  const handleViewOrder = async (order) => {
    try {
      const response = await fetch(`/api/orders/${order._id}`);
      const data = await response.json();

      if (data.success) {
        setSelectedOrder(data.data);
        setIsDetailOpen(true);
      } else {
        toast.error(data.error || 'Failed to load order details');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Failed to load order details');
    }
  };

  const handleConfirmOrder = (orderId) => {
    setConfirmModal({ isOpen: true, orderId, action: 'confirm' });
  };

  const handleCancelOrder = (orderId) => {
    setConfirmModal({ isOpen: true, orderId, action: 'cancel' });
  };

  const confirmAction = async () => {
    const { orderId, action } = confirmModal;
    setConfirmModal({ isOpen: false, orderId: null, action: null });

    try {
      let response;
      if (action === 'confirm') {
        response = await fetch(`/api/orders/${orderId}/confirm`, {
          method: 'PUT',
        });
      } else if (action === 'cancel') {
        response = await fetch(`/api/orders/${orderId}/cancel`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: 'client-cancelled-by-phone',
            notes: 'Cancelled from client tracking dashboard',
          }),
        });
      }

      if (!response) return;

      const data = await response.json();
      if (!data.success) {
        toast.error(data.error || 'Action failed');
        return;
      }

      const messages = {
        confirm: 'Order confirmed successfully',
        cancel: 'Order cancelled successfully',
      };
      toast.success(messages[action] || 'Action completed');

      setOrders((prev) =>
        prev
          .map((order) =>
            order._id === orderId
              ? { ...order, ...data.data }
              : order
          )
          .filter((order) => order.status !== 'cancelled')
      );
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error('Action failed');
    }
  };

  const getStatusBadge = (status) => {
    const normalizedStatus = status?.toLowerCase() || 'pending';

    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon, label: 'Pending' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircleIcon, label: 'Confirmed' },
    };

    const config = statusConfig[normalizedStatus] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Active Orders</h1>
          <p className="text-gray-600 mt-2">Manage all pending and confirmed orders for client tracking.</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
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
                  placeholder="Name, phone, order number..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All (Pending + Confirmed)</option>
                <option value="pending">Pending Only</option>
                <option value="confirmed">Confirmed Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold">{orders.length}</span> orders
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-gray-500">Loading active orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <ClockIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Orders</h3>
            <p className="text-gray-500">No orders match your filters</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">
                              {order.order_number || order.orderNumber || `#${order._id.slice(-8)}`}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                              {getStatusBadge(order.status)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 font-medium">
                            {order.customer_name || order.customerName || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.customer_phone || order.customerPhone || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {order.wilaya_id?.name || order.wilayaName || 'N/A'}
                          </div>
                          {(order.commune_id || order.communeName) && (
                            <div className="text-xs text-gray-500">
                              {order.commune_id?.name || order.communeName}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-gray-900">
                            {(order.total || 0).toLocaleString()} DZD
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }) : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleViewOrder(order)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="View Details"
                            >
                              <EyeIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleConfirmOrder(order._id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Confirm Order"
                            >
                              <CheckCircleIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleCancelOrder(order._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Cancel Order"
                            >
                              <XCircleIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

      {isDetailOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedOrder.orderNumber || `#${selectedOrder._id.slice(-8)}`}
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
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  {getStatusBadge(selectedOrder.status)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Customer</h3>
                    <p className="text-sm text-gray-900">{selectedOrder.customerName || 'N/A'}</p>
                    <p className="text-sm text-gray-600">{selectedOrder.customerPhone || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Delivery Location</h3>
                    <p className="text-sm text-gray-900">{selectedOrder.wilayaId?.name || selectedOrder.wilayaName || 'N/A'}</p>
                    {(selectedOrder.communeId || selectedOrder.communeName) && (
                      <p className="text-sm text-gray-600">{selectedOrder.communeId?.name || selectedOrder.communeName}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                  {(!selectedOrder.items || selectedOrder.items.length === 0) ? (
                    <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                      No items found
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.productName || item.product_name || 'N/A'}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              Qty: {item.quantity || 1} × {(item.unitPrice || item.price || 0).toLocaleString()} DZD
                            </p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {((item.quantity || 1) * (item.unitPrice || item.price || 0)).toLocaleString()} DZD
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="text-gray-900">{selectedOrder.subtotal?.toLocaleString() || '0'} DZD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping Fee:</span>
                      <span className="text-gray-900">{selectedOrder.shippingCost?.toLocaleString() || '0'} DZD</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-gray-900">{selectedOrder.total?.toLocaleString() || '0'} DZD</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, orderId: null, action: null })}
        onConfirm={confirmAction}
        title={
          confirmModal.action === 'confirm'
            ? 'Confirm Order'
            : 'Cancel Order'
        }
        message={
          confirmModal.action === 'confirm'
            ? 'Confirming will move this order to the Anderson pre-sent queue.'
            : 'Cancelling will archive this order and remove it from active tracking.'
        }
        confirmText={
          confirmModal.action === 'confirm'
            ? 'Confirm'
            : 'Cancel Order'
        }
        type={confirmModal.action === 'confirm' ? 'success' : 'danger'}
      />
    </DashboardLayout>
  );
}
