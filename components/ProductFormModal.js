'use client';

import { useToast } from '@/hooks/useToast';
import { createProductBundle, deleteProductBundle, getProductBundles, updateProductBundle } from '@/lib/api/productBundlesApi';
import { PencilIcon, PhotoIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import AlertModal from './AlertModal';
import ConfirmModal from './ConfirmModal';
import Modal from './Modal';
import ProductBundleModal from './ProductBundleModal';

const ProductFormModal = ({ isOpen, onClose, onSubmit, product, categories }) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category_id: '',
    sizes: [],
    colors: [],
    price: '',
    compareAtPrice: '',
    description: '',
    details: {},
    featured: false,
    active: true,
    topSelling: false,
    in_stock: true,
    stock_quantity: 0,
    tags: [],
  });
  
  const [images, setImages] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [deletedImages, setDeletedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });
  const toast = useToast();

  const [sizeInput, setSizeInput] = useState('');
  const [colorInput, setColorInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [detailKey, setDetailKey] = useState('');
  const [detailValue, setDetailValue] = useState('');
  const [bundles, setBundles] = useState([]);
  const [bundleModal, setBundleModal] = useState({ isOpen: false, bundle: null });
  const [deleteBundleModal, setDeleteBundleModal] = useState({ isOpen: false, bundleId: null });
  const [loadingBundles, setLoadingBundles] = useState(false);

  const loadBundles = useCallback(async (productId) => {
    if (!productId) return;
    setLoadingBundles(true);
    try {
      const data = await getProductBundles(productId);
      setBundles(data || []);
    } catch (error) {
      console.error('Failed to load bundles:', error);
      toast.error('Failed to load bundle offers');
    } finally {
      setLoadingBundles(false);
    }
  }, [toast]);

  useEffect(() => {
    if (product && isOpen) {
      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        category_id: product.category_id?._id || product.category_id || '',
        sizes: product.sizes || [],
        colors: product.colors || [],
        price: product.price || '',
        compareAtPrice: product.compareAtPrice || '',
        description: product.description || '',
        details: product.details || {},
        featured: product.featured || false,
        active: product.active !== undefined ? product.active : true,
        topSelling: product.topSelling || false,
        in_stock: product.in_stock !== undefined ? product.in_stock : true,
        stock_quantity: product.stock_quantity || 0,
        tags: product.tags || [],
      });
      setImages(product.images || []);
      setNewImageFiles([]);
      setDeletedImages([]);
      loadBundles(product._id);
    } else if (!product && isOpen) {
      setFormData({
        name: '',
        slug: '',
        category_id: '',
        sizes: [],
        colors: [],
        price: '',
        compareAtPrice: '',
        description: '',
        details: {},
        featured: false,
        active: true,
        topSelling: false,
        in_stock: true,
        stock_quantity: 0,
        tags: [],
      });
      setImages([]);
      setNewImageFiles([]);
      setDeletedImages([]);
      setBundles([]);
    }
  }, [product, isOpen, loadBundles]);

  const handleBundleSubmit = async (bundleData) => {
    if (!product?._id) {
      toast.error('Please save the product first before adding bundles');
      return;
    }

    try {
      if (bundleModal.bundle) {
        // Update existing bundle
        await updateProductBundle(bundleModal.bundle._id, bundleData);
        toast.success('Bundle updated successfully');
      } else {
        // Create new bundle
        await createProductBundle(product._id, bundleData);
        toast.success('Bundle created successfully');
      }
      await loadBundles(product._id);
      setBundleModal({ isOpen: false, bundle: null });
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteBundle = async () => {
    const { bundleId } = deleteBundleModal;
    setDeleteBundleModal({ isOpen: false, bundleId: null });

    try {
      await deleteProductBundle(bundleId);
      toast.success('Bundle deleted successfully');
      await loadBundles(product._id);
    } catch (error) {
      toast.error('Failed to delete bundle');
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const totalImages = images.length + newImageFiles.length + files.length - deletedImages.length;
    
    if (totalImages > 10) {
      setAlertModal({ isOpen: true, message: 'Maximum 10 images allowed' });
      return;
    }

    setNewImageFiles([...newImageFiles, ...files]);
  };

  const removeExistingImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const removeNewImage = (index) => {
    setNewImageFiles(newImageFiles.filter((_, i) => i !== index));
  };

  const addSize = () => {
    if (sizeInput.trim() && !formData.sizes.includes(sizeInput.trim())) {
      setFormData({ ...formData, sizes: [...formData.sizes, sizeInput.trim()] });
      setSizeInput('');
    }
  };

  const removeSize = (size) => {
    setFormData({ ...formData, sizes: formData.sizes.filter((s) => s !== size) });
  };

  const addColor = () => {
    if (colorInput.trim() && !formData.colors.includes(colorInput.trim())) {
      setFormData({ ...formData, colors: [...formData.colors, colorInput.trim()] });
      setColorInput('');
    }
  };

  const removeColor = (color) => {
    setFormData({ ...formData, colors: formData.colors.filter((c) => c !== color) });
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };



  const uploadImages = async () => {
    if (newImageFiles.length === 0) return [];

    // Validate file sizes (max 5MB each)
    const oversizedFiles = newImageFiles.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('Image upload failed', 'All images must be less than 5MB');
      throw new Error('All images must be less than 5MB');
    }

    setUploading(true);
    try {
      const uploadPromises = newImageFiles.map(async (file) => {
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });

        const base64 = await base64Promise;

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: base64, folder: 'products' }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text.includes('too large') || text.includes('Too Large') 
            ? 'Image size exceeds server limit. Please use a smaller image.' 
            : `Upload failed: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.success) {
          return data.data;
        } else {
          throw new Error(data.error || 'Upload failed');
        }
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      toast.error('Image upload failed', error.message);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate required fields before uploading
      if (!formData.name || !formData.category_id || !formData.price) {
        toast.error('Please fill in all required fields');
        setLoading(false);
        return;
      }

      const uploadedImages = await uploadImages();
      
      // Combine existing images with new uploads
      let allImages = [...images];
      
      // If creating new product, use uploaded images
      if (!product) {
        allImages = uploadedImages.map(img => img.url);
      } else {
        // If editing, add new images to existing ones
        if (uploadedImages.length > 0) {
          allImages = [...allImages, ...uploadedImages.map(img => img.url)];
        }
      }
      
      const submitData = {
        ...formData,
        images: allImages,
        price: parseFloat(formData.price) || 0,
        compareAtPrice: formData.compareAtPrice ? parseFloat(formData.compareAtPrice) : undefined,
        stock_quantity: parseInt(formData.stock_quantity) || 0,
      };

      console.log('🚀 Submitting product data:', submitData);

      // onSubmit should handle success/error and will throw if it fails
      await onSubmit(submitData);
      
      // Only close if onSubmit didn't throw
      onClose();
    } catch (error) {
      console.error('❌ Product submit error:', error);
      toast.error(error.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={product ? 'Edit Product' : 'Add New Product'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Enter product name"
            required
          />
        </div>

        {/* Category and Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (DZD) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="0"
              min="0"
              required
            />
          </div>
        </div>

        {/* Compare At Price and Slug */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compare At Price (DZD)
            </label>
            <input
              type="number"
              value={formData.compareAtPrice}
              onChange={(e) => setFormData({ ...formData, compareAtPrice: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Original price (optional)"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">Show as strikethrough price</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slug
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="auto-generated-from-name"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to auto-generate</p>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            rows="3"
            placeholder="Product description..."
          />
        </div>

        {/* Sizes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sizes</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={sizeInput}
              onChange={(e) => setSizeInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g. S, M, L, XL"
            />
            <button
              type="button"
              onClick={addSize}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.sizes.map((size) => (
              <span
                key={size}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
              >
                {size}
                <button type="button" onClick={() => removeSize(size)}>
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Colors</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={colorInput}
              onChange={(e) => setColorInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g. Red, Blue, Black"
            />
            <button
              type="button"
              onClick={addColor}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.colors.map((color) => (
              <span
                key={color}
                className="inline-flex items-center gap-1 px-3 py-1 bg-secondary-100 text-secondary-800 rounded-full text-sm"
              >
                {color}
                <button type="button" onClick={() => removeColor(color)}>
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g. new, sale, trending"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
              >
                #{tag}
                <button type="button" onClick={() => removeTag(tag)}>
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Stock */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock Quantity
            </label>
            <input
              type="number"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              min="0"
            />
          </div>

          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.in_stock}
                onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">In Stock</span>
            </label>
          </div>
        </div>

        {/* Product Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">⭐ Featured Product</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.topSelling}
                onChange={(e) => setFormData({ ...formData, topSelling: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">🔥 Top Selling</span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">✓ Active (Visible)</span>
            </label>
          </div>
        </div>

        {/* Product Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product Images (Max 10)
          </label>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* Existing Images */}
            {images.map((img, index) => (
              <div key={index} className="relative aspect-square border-2 border-gray-200 rounded-lg overflow-hidden">
                <Image src={img} alt="Product" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => removeExistingImage(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* New Images */}
            {newImageFiles.map((file, index) => (
              <div key={index} className="relative aspect-square border-2 border-gray-200 rounded-lg overflow-hidden">
                <Image
                  src={URL.createObjectURL(file)}
                  alt="New"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeNewImage(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Add More Button */}
            {images.length + newImageFiles.length - deletedImages.length < 10 && (
              <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
                <div className="text-center">
                  <PhotoIcon className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                  <span className="text-xs text-gray-500">Add Image</span>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Bundle Offers - Only show if product exists (has _id) */}
        {product?._id && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Bundle Offers
              </label>
              <button
                type="button"
                onClick={() => setBundleModal({ isOpen: true, bundle: null })}
                className="px-3 py-1 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm flex items-center gap-1"
              >
                <PlusIcon className="w-4 h-4" />
                Add Bundle
              </button>
            </div>
            
            {loadingBundles ? (
              <div className="text-center py-4 text-gray-500">Loading bundles...</div>
            ) : bundles.length === 0 ? (
              <div className="text-center py-4 bg-gray-50 rounded-lg text-gray-500 text-sm">
                No bundle offers yet. Click &quot;Add Bundle&quot; to create one.
              </div>
            ) : (
              <div className="space-y-2">
                {bundles.map((bundle) => {
                  // Use compareAtPrice (original price) if available, otherwise use price
                  const originalUnitPrice = (product?.compareAtPrice || product?.price || 0);
                  
                  // Calculate product discount per unit (if compareAtPrice exists)
                  const productDiscountPerUnit = product?.compareAtPrice ? (product.compareAtPrice - product.price) : 0;
                  const totalProductDiscount = productDiscountPerUnit * bundle.quantity;
                  
                  // Total savings = product discount + bundle discount
                  const totalSavings = totalProductDiscount + bundle.discount;
                  
                  // Original total price
                  const originalPrice = originalUnitPrice * bundle.quantity;
                  
                  // Final price after both discounts
                  const newPrice = originalPrice - totalSavings;
                  
                  // Combined discount percentage
                  const discountPercent = originalPrice > 0 ? Math.round((totalSavings / originalPrice) * 100) : 0;
                  const now = new Date();
                  const isActive = bundle.active && 
                    (!bundle.startDate || new Date(bundle.startDate) <= now) &&
                    (!bundle.endDate || new Date(bundle.endDate) >= now);

                  return (
                    <div key={bundle._id} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">
                              Buy {bundle.quantity} - Save {totalSavings.toLocaleString()} DZD ({discountPercent}%)
                            </span>
                            {isActive ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">Inactive</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-0.5">
                            <div>Original: {originalPrice.toLocaleString()} DZD → Final: {newPrice.toLocaleString()} DZD</div>
                            {totalProductDiscount > 0 && (
                              <div className="text-xs text-gray-500">
                                (Product: -{totalProductDiscount.toLocaleString()} DZD + Bundle: -{bundle.discount.toLocaleString()} DZD)
                              </div>
                            )}
                            {bundle.startDate && (
                              <div>Starts: {new Date(bundle.startDate).toLocaleDateString()}</div>
                            )}
                            {bundle.endDate && (
                              <div>Ends: {new Date(bundle.endDate).toLocaleDateString()}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-2">
                          <button
                            type="button"
                            onClick={() => setBundleModal({ isOpen: true, bundle })}
                            className="p-1.5 text-primary-600 hover:bg-primary-50 rounded"
                            title="Edit bundle"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteBundleModal({ isOpen: true, bundleId: bundle._id })}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Delete bundle"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={loading || uploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || uploading}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
          </button>
        </div>
        </form>
      </Modal>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, message: '' })}
        title="Image Limit Reached"
        message={alertModal.message}
        type="warning"
      />

      <ProductBundleModal
        isOpen={bundleModal.isOpen}
        onClose={() => setBundleModal({ isOpen: false, bundle: null })}
        onSubmit={handleBundleSubmit}
        bundle={bundleModal.bundle}
        product={product}
      />

      <ConfirmModal
        isOpen={deleteBundleModal.isOpen}
        onClose={() => setDeleteBundleModal({ isOpen: false, bundleId: null })}
        onConfirm={handleDeleteBundle}
        title="Delete Bundle Offer"
        message="Are you sure you want to delete this bundle offer? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </>
  );
};

export default ProductFormModal;
