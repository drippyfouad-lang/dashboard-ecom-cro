'use client';

import { useToast } from '@/hooks/useToast';
import { useEffect, useState } from 'react';
import Modal from './Modal';

const ProductBundleModal = ({ isOpen, onClose, onSubmit, bundle, product }) => {
  const [formData, setFormData] = useState({
    quantity: '',
    discount: '',
    active: true,
    startDate: '',
    endDate: '',
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (bundle && isOpen) {
      setFormData({
        quantity: bundle.quantity || '',
        discount: bundle.discount || '',
        active: bundle.active !== undefined ? bundle.active : true,
        startDate: bundle.startDate ? new Date(bundle.startDate).toISOString().split('T')[0] : '',
        endDate: bundle.endDate ? new Date(bundle.endDate).toISOString().split('T')[0] : '',
      });
    } else if (!bundle && isOpen) {
      setFormData({
        quantity: '',
        discount: '',
        active: true,
        startDate: '',
        endDate: '',
      });
    }
  }, [bundle, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate
      if (!formData.quantity || formData.quantity < 1) {
        toast.error('Quantity must be at least 1');
        setLoading(false);
        return;
      }

      if (formData.discount === '' || formData.discount < 0) {
        toast.error('Discount must be a non-negative number');
        setLoading(false);
        return;
      }

      if (formData.startDate && formData.endDate) {
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        if (end <= start) {
          toast.error('End date must be after start date');
          setLoading(false);
          return;
        }
      }

      const bundleData = {
        quantity: parseInt(formData.quantity),
        discount: parseFloat(formData.discount),
        active: formData.active,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      };

      await onSubmit(bundleData);
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to save bundle');
    } finally {
      setLoading(false);
    }
  };

  // Calculate display values
  // Use compareAtPrice (original price) if available, otherwise use price
  const originalUnitPrice = product?.compareAtPrice || product?.price || 0;
  const quantity = parseInt(formData.quantity) || 0;
  const bundleDiscount = parseFloat(formData.discount) || 0;
  
  // Calculate product discount per unit (if compareAtPrice exists)
  const productDiscountPerUnit = product?.compareAtPrice ? (product.compareAtPrice - product.price) : 0;
  const totalProductDiscount = productDiscountPerUnit * quantity;
  
  // Total savings = product discount + bundle discount
  const totalSavings = totalProductDiscount + bundleDiscount;
  
  // Original total price
  const originalPrice = originalUnitPrice * quantity;
  
  // Final price after both discounts
  const newPrice = Math.max(0, originalPrice - totalSavings);
  
  // Combined discount percentage
  const discountPercent = originalPrice > 0 ? Math.round((totalSavings / originalPrice) * 100) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={bundle ? 'Edit Bundle Offer' : 'Add Bundle Offer'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Minimum quantity"
            min="1"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Minimum quantity to qualify for this bundle</p>
        </div>

        {/* Discount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Discount (DZD) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.discount}
            onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="0"
            min="0"
            step="0.01"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Fixed discount amount in DZD</p>
        </div>

        {/* Active Toggle */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">Whether this bundle is currently active</p>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date (Optional)
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="text-xs text-gray-500 mt-1">When the bundle becomes active (leave empty for immediate activation)</p>
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date (Optional)
          </label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            min={formData.startDate || undefined}
          />
          <p className="text-xs text-gray-500 mt-1">When the bundle expires (leave empty for no expiration)</p>
        </div>

        {/* Price Calculation Display */}
        {product && quantity > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Price Calculation</h4>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Original Price ({originalUnitPrice.toLocaleString()} × {quantity}):</span>
              <span className="font-medium">{originalPrice.toLocaleString()} DZD</span>
            </div>
            {totalProductDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Product Discount:</span>
                <span className="font-medium text-orange-600">-{totalProductDiscount.toLocaleString()} DZD</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Bundle Discount:</span>
              <span className="font-medium text-red-600">-{bundleDiscount.toLocaleString()} DZD</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-1">
              <span className="text-gray-600 font-semibold">Total Savings:</span>
              <span className="font-semibold text-red-600">-{totalSavings.toLocaleString()} DZD ({discountPercent}%)</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Final Price:</span>
              <span className="text-primary-600">{newPrice.toLocaleString()} DZD</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Formula: {originalPrice.toLocaleString()} - {totalSavings.toLocaleString()} = {newPrice.toLocaleString()} DZD
              {product?.compareAtPrice && (
                <span className="block mt-1 text-gray-400">
                  (Original: {product.compareAtPrice.toLocaleString()} DZD/unit, Current: {product.price.toLocaleString()} DZD/unit)
                </span>
              )}
            </p>
          </div>
        )}

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
            disabled={loading}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : bundle ? 'Update Bundle' : 'Create Bundle'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ProductBundleModal;


