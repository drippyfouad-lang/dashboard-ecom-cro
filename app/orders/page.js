'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import OrderFormModal from '@/components/OrderFormModal';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import { utils, writeFile } from 'xlsx';
import {
  MagnifyingGlassIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  PencilIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

export default function PendingOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, orderId: null, action: null });

  const toast = useToast();

  useEffect(() => {
    fetchPendingOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery]);

  const fetchPendingOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/orders/pending?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.data);
        setTotalPages(data.pagination.pages);
      } else {
        toast.error('Failed to fetch pending orders');
      }
    } catch (error) {
      console.error('Error fetching pending orders:', error);
      toast.error('Failed to fetch pending orders');
    } finally {
      setLoading(false);
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
            reason: 'cancelled-by-admin',
            notes: 'Cancelled from pending orders dashboard',
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const messages = {
          confirm: 'Order confirmed successfully',
          cancel: 'Order cancelled successfully',
        };
        toast.success(messages[action] || 'Action completed');
        
        // Update UI immediately instead of refetching
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId 
              ? { ...order, ...data.data }
              : order
          ).filter(order => order.status === 'pending')
        );
      } else {
        toast.error(data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error(`Action failed: ${error.message}`);
    }
  };

  const handleViewOrder = async (order) => {
    try {
      // Fetch full order details with items
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

  const handleEditOrder = async (order) => {
    try {
      // Fetch full order details with items
      const response = await fetch(`/api/orders/${order._id}`);
      const data = await response.json();
      
      if (data.success) {
        setEditingOrder(data.data);
        setIsFormOpen(true);
      } else {
        toast.error(data.error || 'Failed to load order details');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Failed to load order details');
    }
  };

  const handleSubmitOrder = async (orderData) => {
    try {
      const url = editingOrder ? `/api/orders/${editingOrder._id}` : '/api/orders';
      const method = editingOrder ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(editingOrder ? 'Order updated successfully' : 'Order created successfully');
        setIsFormOpen(false);
        setEditingOrder(null);
        fetchPendingOrders();
      } else {
        throw new Error(data.error || 'Failed to save order');
      }
    } catch (error) {
      console.error('Error saving order:', error);
      throw error; // Let the form handle the error
    }
  };

  const handleAddOrder = () => {
    setEditingOrder(null);
    setIsFormOpen(true);
  };

  // Export pending orders to Excel
  const exportOrdersToExcel = () => {
    try {
      const excelData = orders.map((order) => {
        const productDetails = (order.items || []).map((item, index) => {
          const quantity = Number(item.quantity || 0);
          const unitPrice = Number(item.unitPrice || item.price || 0);
          const parts = [
            `${index + 1}. ${item.productName || item.product_name || 'Product'}`,
            `Qty: ${quantity}`,
            `Unit: ${unitPrice.toLocaleString()} DZD`,
            `Total: ${(unitPrice * quantity).toLocaleString()} DZD`,
          ];

          if (item.selectedSize || item.selected_size) {
            parts.push(`Size: ${item.selectedSize || item.selected_size}`);
          }

          if (item.selectedColor || item.selected_color) {
            parts.push(`Color: ${item.selectedColor || item.selected_color}`);
          }

          return parts.join(' | ');
        }).join('\n');

        return {
          'Order Number': order.orderNumber || order._id.slice(-8),
          'Customer Name': order.customerName || order.customer_name,
          'Customer Phone': order.customerPhone || order.customer_phone,
          'Wilaya': order.wilayaId?.name || order.wilayaName || '',
          'Commune': order.communeId?.name || order.communeName || '',
          'Payment Method': order.paymentMethod || order.payment_method,
          'Subtotal (DZD)': order.subtotal || 0,
          'Shipping Fee (DZD)': order.shippingCost || order.shipping_cost || 0,
          'Total Amount (DZD)': order.total || 0,
          'Items Count': order.items?.length || 0,
          'Product Details': productDetails || 'No items listed',
          'Order Date': new Date(order.createdAt).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }),
        };
      });

      const ws = utils.json_to_sheet(excelData);
      ws['!cols'] = [
        { wch: 18 }, // Order Number
        { wch: 22 }, // Customer Name
        { wch: 16 }, // Customer Phone
        { wch: 16 }, // Wilaya
        { wch: 16 }, // Commune
        { wch: 18 }, // Payment Method
        { wch: 15 }, // Subtotal
        { wch: 15 }, // Shipping Fee
        { wch: 15 }, // Total
        { wch: 12 }, // Items Count
        { wch: 50 }, // Product Details
        { wch: 20 }, // Order Date
      ];

      const range = utils.decode_range(ws['!ref'] || 'A1');
      const border = {
        top: { style: 'thin', color: { rgb: 'DDDDDD' } },
        bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
        left: { style: 'thin', color: { rgb: 'DDDDDD' } },
        right: { style: 'thin', color: { rgb: 'DDDDDD' } },
      };

      for (let row = range.s.r; row <= range.e.r; row += 1) {
        for (let col = range.s.c; col <= range.e.c; col += 1) {
          const cellAddress = utils.encode_cell({ r: row, c: col });
          const cell = ws[cellAddress];
          if (!cell) continue;

          cell.s = {
            border,
            alignment: { vertical: 'top', wrapText: true },
            font: { name: 'Poppins', sz: 11 },
          };
        }
      }

      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Pending Orders');

      const now = new Date();
      const filename = `pending-orders-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.xlsx`;

      writeFile(wb, filename);

      toast.success(`Exported ${orders.length} pending orders successfully!`);
    } catch (error) {
      toast.error('Failed to export orders');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pending Orders</h1>
            <p className="text-gray-600 mt-1">Non-Treated Orders (Pending Status Only)</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAddOrder}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Add Order
            </button>
            <button
              onClick={exportOrdersToExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Export to Excel
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
            <p className="mt-2 text-gray-500">Loading pending orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <ClockIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Orders</h3>
            <p className="text-gray-500">All orders have been treated</p>
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
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-900">
                            {order.orderNumber || `#${order._id.slice(-8)}`}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <ClockIcon className="w-4 h-4 text-yellow-500" />
                            <span className="text-xs text-yellow-700 font-medium">Pending</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{order.customerName || 'N/A'}</div>
                            <div className="text-gray-500">{order.customerPhone || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {order.wilayaId?.name || order.wilayaName || 'N/A'}
                          </div>
                          {(order.communeId || order.communeName) && (
                            <div className="text-xs text-gray-500">{order.communeId?.name || order.communeName}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-gray-900">
                            {order.total?.toLocaleString() || '0'} DZD
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
                              onClick={() => handleEditOrder(order)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                              title="Edit Order"
                            >
                              <PencilIcon className="w-5 h-5" />
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
                {/* Status */}
                <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                  <ClockIcon className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-700">Pending Treatment</span>
                </div>

                {/* Customer & Shipping Info */}
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

                {/* Payment Method */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Payment Method</h3>
                  <p className="text-sm text-gray-900">{selectedOrder.paymentMethod || 'Cash on Delivery'}</p>
                </div>

                {/* Order Items */}
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
                              {item.selectedSize && ` • Size: ${item.selectedSize}`}
                              {item.selectedColor && ` • Color: ${item.selectedColor}`}
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

                {/* Totals */}
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

                {/* Notes - Removed per requirements */}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleConfirmOrder(selectedOrder._id);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    Confirm
                  </button>
                  <button
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleCancelOrder(selectedOrder._id);
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                  >
                    <XCircleIcon className="w-5 h-5" />
                    Cancel Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Form Modal (Add/Edit) */}
      <OrderFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingOrder(null);
        }}
        onSubmit={handleSubmitOrder}
        order={editingOrder}
      />

      {/* Confirm Action Modal */}
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
            : 'Cancelling will archive this order and remove it from pending orders.'
        }
        confirmText={
          confirmModal.action === 'confirm' 
            ? 'Confirm' 
            : 'Cancel Order'
        }
        type={
          confirmModal.action === 'confirm' 
            ? 'success' 
            : 'danger'
        }
      />
    </DashboardLayout>
  );
}
