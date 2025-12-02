'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import { useToast } from '@/hooks/useToast';
import {
  ClockIcon,
  CheckCircleIcon,
  TruckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export default function ActiveOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(''); // '', 'pending', 'confirmed'
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');

  const toast = useToast();

  const fetchActiveOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/orders/client/active?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data);
      } else {
        toast.error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveOrders();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchActiveOrders, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleCancelOrder = (order) => {
    setOrderToCancel(order);
    setCancelModalOpen(true);
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel) return;

    try {
      const response = await fetch(`/api/orders/${orderToCancel._id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancellationReason || 'client-cancelled-by-phone' }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Order cancelled successfully');
        setCancelModalOpen(false);
        setOrderToCancel(null);
        setCancellationReason('');
        fetchActiveOrders();
      } else {
        toast.error(data.error || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: {
        icon: ClockIcon,
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        label: 'Pending',
      },
      confirmed: {
        icon: CheckCircleIcon,
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        label: 'Confirmed',
      },
      sent: {
        icon: TruckIcon,
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        label: 'Sent to Delivery',
      },
      shipped: {
        icon: TruckIcon,
        bg: 'bg-indigo-100',
        text: 'text-indigo-800',
        label: 'In Transit',
      },
      'out-for-delivery': {
        icon: TruckIcon,
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Out for Delivery',
      },
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-4 h-4 mr-1.5" />
        {badge.label}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Active Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track your pending and confirmed orders
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 rounded-lg font-medium ${
              statusFilter === ''
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Active
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium ${
              statusFilter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('confirmed')}
            className={`px-4 py-2 rounded-lg font-medium ${
              statusFilter === 'confirmed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Confirmed
          </button>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-gray-500">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <ClockIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Orders</h3>
            <p className="text-gray-500">You don&apos;t have any active orders at the moment</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Order #{order.order_number || order._id.slice(-8)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    {order.ecotrack_tracking_number && (
                      <p className="text-sm text-gray-600 mt-1">
                        Tracking: <span className="font-mono font-medium">{order.ecotrack_tracking_number}</span>
                      </p>
                    )}
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                {/* Order Items */}
                <div className="space-y-2 mb-4">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      {item.product_image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.product_image}
                          alt={item.product_name || 'Product'}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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

                  {/* Actions */}
                  {order.can_cancel && (
                    <button
                      onClick={() => {
                        setOrderToCancel(order);
                        setCancelModalOpen(true);
                      }}
                      className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <XMarkIcon className="w-5 h-5 mr-2" />
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancel Order Modal */}
      {cancelModalOpen && orderToCancel && (
        <Modal
          title="Cancel Order"
          onClose={() => {
            setCancelModalOpen(false);
            setOrderToCancel(null);
            setCancellationReason('');
          }}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to cancel order <strong>#{orderToCancel.order_number || orderToCancel._id.slice(-8)}</strong>?
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for cancellation (optional)
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tell us why you're cancelling this order..."
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setCancelModalOpen(false);
                  setOrderToCancel(null);
                  setCancellationReason('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Cancel Order
              </button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
