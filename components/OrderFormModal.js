'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import { useWilayas, useCommunes, useProducts } from '@/hooks/useData';
import Modal from './Modal';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

const OrderFormModal = ({ isOpen, onClose, onSubmit, order }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    wilayaId: '',
    communeId: '',
    deliveryType: 'to_home',
    items: [],
    shippingCost: 0,
    paymentMethod: 'cash',
  });

  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // Fetch wilayas, communes, products with smart caching
  const {
    data: wilayasData,
    error: wilayasError,
    loading: wilayasLoading,
    revalidate: revalidateWilayas,
  } = useWilayas();
  const {
    data: communesData,
    error: communesError,
    loading: communesLoading,
    revalidate: revalidateCommunes,
  } = useCommunes(formData.wilayaId);
  const {
    data: productsData,
    error: productsError,
    loading: productsLoading,
    revalidate: revalidateProducts,
  } = useProducts({ limit: '100', stock: 'in' });

  // Handle data structure - useWilayas/useCommunes return array directly, useProducts returns object
  const wilayas = Array.isArray(wilayasData) ? wilayasData : [];
  const communes = Array.isArray(communesData) ? communesData : [];
  const products = productsData?.data || [];

  useEffect(() => {
    if (order && isOpen) {
      // Map order items to form format with camelCase
      const mappedItems = (order.items || []).map(item => ({
        productId: item.productId?._id || item.productId || '',
        productName: item.productName || item.productId?.name || '',
        sku: item.sku || item.productId?.sku || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || item.productId?.price || 0,
        selectedSize: item.selectedSize || '',
        selectedColor: item.selectedColor || '',
        availableSizes: item.productId?.sizes || [],
        availableColors: item.productId?.colors || [],
      }));

      setFormData({
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        wilayaId: order.wilayaId?._id || order.wilayaId || '',
        communeId: order.communeId?._id || order.communeId || '',
        deliveryType: order.deliveryType || 'to_home',
        items: mappedItems,
        shippingCost: order.shippingCost || 0,
        paymentMethod: order.paymentMethod || 'cash',
      });
    } else if (!order && isOpen) {
      setFormData({
        customerName: '',
        customerPhone: '',
        wilayaId: '',
        communeId: '',
        deliveryType: 'to_home',
        items: [],
        shippingCost: 0,
        paymentMethod: 'cash',
      });
    }
  }, [order, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (revalidateWilayas) {
      revalidateWilayas();
    }

    if (revalidateProducts) {
      revalidateProducts();
    }

    if (formData.wilayaId && revalidateCommunes) {
      revalidateCommunes();
    }
  }, [isOpen, formData.wilayaId, revalidateWilayas, revalidateProducts, revalidateCommunes]);

  // Show error toasts for failed fetches
  useEffect(() => {
    if (wilayasError) {
      toast.error('Failed to load wilayas. Please refresh the page.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wilayasError]);

  useEffect(() => {
    if (communesError) {
      toast.error('Failed to load communes. Please select a wilaya.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communesError]);

  useEffect(() => {
    if (productsError) {
      toast.error('Failed to load products. Please refresh the page.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsError]);

  useEffect(() => {
    if (formData.wilayaId || formData.communeId) {
      updateShippingCost();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.wilayaId, formData.communeId, formData.deliveryType, wilayas, communes]);

  const updateShippingCost = () => {
    // First try to get price from commune
    if (formData.communeId) {
      const commune = communes.find(c => c._id === formData.communeId);
      if (commune) {
        const price = formData.deliveryType === 'to_home' 
          ? (commune.shipping_price_home || commune.shippingPriceHome || 0)
          : (commune.shipping_price_desk || commune.shippingPriceDesk || 0);
        if (price > 0) {
          setFormData(prev => ({ ...prev, shippingCost: price }));
          return;
        }
      }
    }
    
    // Fallback to wilaya price
    if (formData.wilayaId) {
      const wilaya = wilayas.find(w => w._id === formData.wilayaId);
      if (wilaya) {
        const price = formData.deliveryType === 'to_home'
          ? (wilaya.shipping_price_home || wilaya.shippingPriceHome || 0)
          : (wilaya.shipping_price_desk || wilaya.shippingPriceDesk || 0);
        setFormData(prev => ({ ...prev, shippingCost: price }));
      }
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          productId: '',
          productName: '',
          sku: '',
          quantity: 1,
          unitPrice: 0,
          selectedSize: '',
          selectedColor: '',
          availableSizes: [],
          availableColors: [],
        },
      ],
    });
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    // If product is selected, auto-fill name, sku, price, sizes, colors
    if (field === 'productId' && value) {
      const product = products.find((p) => p._id === value);
      if (product) {
        newItems[index].productName = product.name;
        newItems[index].sku = product.sku || '';
        newItems[index].unitPrice = product.price;
        newItems[index].selectedSize = '';
        newItems[index].selectedColor = '';
        newItems[index].availableSizes = product.sizes || [];
        newItems[index].availableColors = product.colors || [];
      }
    }

    setFormData({ ...formData, items: newItems });
  };

  const getSelectedProduct = (productId) => {
    return products.find(p => p._id === productId);
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity || 0), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + (parseFloat(formData.shippingCost) || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate items exist
    if (formData.items.length === 0) {
      toast.error('Please add at least one item to the order');
      return;
    }

    // Validate that size and color are selected when product has options
    try {
      for (let i = 0; i < formData.items.length; i++) {
        const item = formData.items[i];
        
        if (!item.productId) {
          toast.error(`Item ${i + 1}: Please select a product`);
          return;
        }

        const product = getSelectedProduct(item.productId);
        
        if (!product) {
          toast.error(`Item ${i + 1}: Selected product not found`);
          return;
        }
        
        if (product.sizes && product.sizes.length > 0 && !item.selectedSize) {
          toast.error(`Item ${i + 1}: Please select a size for ${product.name}`);
          return;
        }
        
        if (product.colors && product.colors.length > 0 && !item.selectedColor) {
          toast.error(`Item ${i + 1}: Please select a color for ${product.name}`);
          return;
        }

        if (!item.quantity || item.quantity < 1) {
          toast.error(`Item ${i + 1}: Quantity must be at least 1`);
          return;
        }

        if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
          toast.error(`Item ${i + 1}: Invalid price`);
          return;
        }
      }
    } catch (validationError) {
      toast.error('Validation error: ' + validationError.message);
      return;
    }
    
    // Get wilaya and commune details for the order
    const selectedWilaya = wilayas.find(w => w._id === formData.wilayaId);
    const selectedCommune = communes.find(c => c._id === formData.communeId);
    
    if (!selectedWilaya) {
      toast.error('Please select a valid wilaya');
      return;
    }

    setLoading(true);
    try {
      // Prepare order data with camelCase fields
      const orderData = {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        wilayaId: formData.wilayaId,
        wilayaName: selectedWilaya.name,
        wilayaCode: selectedWilaya.code,
        communeId: formData.communeId || undefined,
        communeName: selectedCommune?.name || undefined,
        deliveryType: formData.deliveryType,
        paymentMethod: formData.paymentMethod,
        items: formData.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          selectedSize: item.selectedSize || undefined,
          selectedColor: item.selectedColor || undefined,
          total: item.quantity * item.unitPrice,
        })),
        subtotal: calculateSubtotal(),
        shippingCost: parseFloat(formData.shippingCost) || 0,
        total: calculateTotal(),
        status: 'pending',
      };

      await onSubmit(orderData);
      onClose();
      toast.success(order ? 'Order updated successfully' : 'Order created successfully');
    } catch (error) {
      toast.error('Failed to save order: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={order ? 'Edit Order' : 'Create New Order'} size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0XXX XX XX XX"
                required
              />
            </div>
          </div>
        </div>

        {/* Shipping Information */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Shipping Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wilaya <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.wilayaId}
                onChange={(e) => setFormData({ ...formData, wilayaId: e.target.value, communeId: '' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
                disabled={wilayasLoading}
              >
                <option value="">{wilayasLoading ? 'Loading wilayas...' : 'Select Wilaya'}</option>
                {wilayas.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.code} - {w.name}
                  </option>
                ))}
              </select>
              {wilayasError && (
                <p className="mt-1 text-sm text-red-600">Failed to load wilayas</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commune
              </label>
              <select
                value={formData.communeId}
                onChange={(e) => setFormData({ ...formData, communeId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={!formData.wilayaId || communesLoading}
              >
                <option value="">
                  {!formData.wilayaId 
                    ? 'Select a wilaya first' 
                    : communesLoading 
                    ? 'Loading communes...' 
                    : 'Select Commune (Optional)'}
                </option>
                {communes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {communesError && formData.wilayaId && (
                <p className="mt-1 text-sm text-red-600">Failed to load communes</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.deliveryType}
                onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="to_home">Home Delivery</option>
                <option value="to_desk">Desk Delivery</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="cash">Cash on Delivery</option>
                <option value="card">Credit/Debit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Order Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-1 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm flex items-center gap-1"
              disabled={productsLoading}
            >
              <PlusIcon className="w-4 h-4" />
              Add Item
            </button>
          </div>

          {formData.items.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No items added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.items.map((item, index) => {
                const selectedProduct = getSelectedProduct(item.productId);
                return (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-12 gap-3">
                      {/* Product Selection */}
                      <div className="col-span-12 md:col-span-4">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Product <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={item.productId}
                          onChange={(e) => updateItem(index, 'productId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          required
                          disabled={productsLoading}
                        >
                          <option value="">{productsLoading ? 'Loading...' : 'Select Product'}</option>
                          {products.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name} - {p.price} DZD
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-6 md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Qty"
                          min="1"
                          required
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-6 md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Price (DZD) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="Price"
                          min="0"
                          required
                        />
                      </div>

                      {/* Size */}
                      <div className="col-span-6 md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Size {selectedProduct?.sizes?.length > 0 && <span className="text-red-500">*</span>}
                        </label>
                        {selectedProduct?.sizes?.length > 0 ? (
                          <select
                            value={item.selectedSize}
                            onChange={(e) => updateItem(index, 'selectedSize', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            required
                          >
                            <option value="">Select *</option>
                            {selectedProduct.sizes.map((size, i) => (
                              <option key={i} value={size}>{size}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={item.selectedSize}
                            onChange={(e) => updateItem(index, 'selectedSize', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="Optional"
                          />
                        )}
                      </div>

                      {/* Color */}
                      <div className="col-span-5 md:col-span-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Color {selectedProduct?.colors?.length > 0 && <span className="text-red-500">*</span>}
                        </label>
                        {selectedProduct?.colors?.length > 0 ? (
                          <select
                            value={item.selectedColor}
                            onChange={(e) => updateItem(index, 'selectedColor', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            required
                          >
                            <option value="">Select *</option>
                            {selectedProduct.colors.map((color, i) => (
                              <option key={i} value={color}>{color}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={item.selectedColor}
                            onChange={(e) => updateItem(index, 'selectedColor', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="Optional"
                          />
                        )}
                      </div>

                      {/* Remove Button */}
                      <div className="col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="w-full p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Remove item"
                        >
                          <XMarkIcon className="w-5 h-5 mx-auto" />
                        </button>
                      </div>
                    </div>

                    {/* Item Total */}
                    {item.productId && (
                      <div className="mt-2 text-right text-sm text-gray-600">
                        Item Total: <span className="font-semibold">{(item.quantity * item.unitPrice).toLocaleString()} DZD</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Order Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{calculateSubtotal().toLocaleString()} DZD</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping Cost:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.shippingCost}
                  onChange={(e) => setFormData({ ...formData, shippingCost: parseFloat(e.target.value) || 0 })}
                  className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                  min="0"
                />
                <span className="text-xs text-gray-500">DZD</span>
              </div>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-primary-600">{calculateTotal().toLocaleString()} DZD</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || formData.items.length === 0 || wilayasLoading || productsLoading}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : order ? 'Update Order' : 'Create Order'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default OrderFormModal;
