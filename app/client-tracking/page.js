'use client';

import { useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ConfirmModal from '@/components/ConfirmModal';
import { useOrders } from '@/hooks/useData';
import { useToast } from '@/hooks/useToast';
import {
  MagnifyingGlassIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  FunnelIcon,
  PhoneIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

export default function ClientTrackingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, orderId: null, action: null });

  const toast = useToast();

  const queryParams = useMemo(() => {
    const params = {
      page: page.toString(),
      limit: '10',
    };
    if (searchQuery) params.search = searchQuery;
    if (statusFilter) params.status = statusFilter;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return params;
  }, [page, searchQuery, statusFilter, startDate, endDate]);

  const { data: ordersData, loading, revalidate } = useOrders(queryParams);
  const orders = ordersData?.data || [];
  const pagination = ordersData?.pagination || { page: 1, limit: 10, total: 0, pages: 0 };

  const getStatusBadge = (status) => {
    const normalizedStatus = status?.toLowerCase() || 'pending';
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon, label: 'Pending' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircleIcon, label: 'Confirmed' },
      delivered: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon, label: 'Delivered' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon, label: 'Cancelled' },
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

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleApplyFilters = () => {
    setPage(1);
    if (revalidate) revalidate();
  };

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
      console.error('Error loading order details:', error);
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
            notes: 'Cancelled from client tracking overview',
          }),
        });
      }

      if (!response) return;

      const data = await response.json();
      if (!data.success) {
        toast.error(data.error || 'Action failed');
        return;
      }

      if (revalidate) revalidate();

      toast.success(
        action === 'confirm'
          ? 'Order confirmed successfully'
          : 'Order cancelled successfully'
      );
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error('Action failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Client Tracking</h1>
          <p className="text-gray-600 mt-2">Review and treat every customer order with consistent confirm/cancel actions.</p>
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Order number, customer name, phone..."
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              <FunnelIcon className="w-5 h-5 inline mr-2" />
              Clear Filters
            </button>
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              Apply Filters
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold">{orders.length}</span> of{' '}
            <span className="font-semibold">{pagination.total}</span> orders
          </p>
        </div>

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
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      Loading orders...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {order.orderNumber || order.order_number || `#${order._id.slice(-8)}`}
                          </span>
                          <div className="mt-1">
                            {getStatusBadge(order.status)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {order.customerName || order.customer_name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <PhoneIcon className="w-4 h-4 text-gray-400" />
                          {order.customerPhone || order.customer_phone || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {order.wilayaId?.name || order.wilayaName || order.wilaya_id?.name || 'N/A'}
                        </div>
                        {(order.communeId || order.commune_id || order.communeName) && (
                          <div className="text-xs text-gray-500">
                            {order.communeId?.name || order.commune_id?.name || order.communeName}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-900">
                          {(order.total || 0).toLocaleString()} DZD
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {pagination.page} of {pagination.pages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
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
            : 'Cancelling will archive this order and remove it from pending workflows.'
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
