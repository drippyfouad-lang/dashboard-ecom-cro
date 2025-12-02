'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ProductFormModal from '@/components/ProductFormModal';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import { useProducts, useCategories } from '@/hooks/useData';
import Image from 'next/image';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

export default function ProductsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, productId: null });

  const toast = useToast();

  // Build query params
  const queryParams = useMemo(() => {
    const params = {
      page: page.toString(),
      limit: '12',
      search: searchQuery,
    };
    if (categoryFilter) params.category = categoryFilter;
    if (stockFilter !== 'all') params.stock = stockFilter;
    return params;
  }, [page, searchQuery, categoryFilter, stockFilter]);

  // Fetch products with smart caching
  const { data: productsData, loading, error, mutate, revalidate } = useProducts(queryParams);
  const products = productsData?.data || [];
  const pagination = productsData?.pagination || { page: 1, limit: 12, total: 0, pages: 0 };

  // Fetch categories with long caching
  const { data: categoriesData } = useCategories({ all: 'true' });
  const categories = categoriesData?.data || [];

  const logActivity = async (payload) => {
    try {
      await fetch('/api/activity/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      toast.error('Failed to record activity');
    }
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = async (product) => {
    try {
      const response = await fetch(`/api/products/${product._id}`);
      const data = await response.json();
      if (data.success) {
        setSelectedProduct(data.data);
        setIsModalOpen(true);
      }
    } catch (error) {
      toast.error('Failed to load product details');
    }
  };

  const handleSubmit = async (formData) => {
    console.log('📤 handleSubmit called with:', formData);
    
    const url = selectedProduct
      ? `/api/products/${selectedProduct._id}`
      : '/api/products';
    const method = selectedProduct ? 'PUT' : 'POST';

    console.log(`🌐 Fetching ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    console.log('📡 Response status:', response.status);

    const data = await response.json();
    console.log('📨 Response data:', data);

    if (!data.success) {
      throw new Error(data.error || 'Operation failed');
    }

    // Success - show toast, update cache and log activity
    toast.success(
      `Product ${selectedProduct ? 'updated' : 'created'} successfully`
    );
    setIsModalOpen(false);
    revalidate();
    
    // Log activity
    try {
      await logActivity({
        actionType: selectedProduct ? 'update' : 'create',
        resource: 'product',
        resourceId: data.data?._id || selectedProduct?._id,
        entityName: formData.name,
        details: {
          summary: selectedProduct ? 'Product updated' : 'Product created',
          price: formData.price,
        },
      });
    } catch (logError) {
      console.warn('Failed to log activity:', logError);
    }

    return data;
  };

  const handleDeleteProduct = async (id) => {
    setConfirmModal({ isOpen: true, productId: id });
  };

  const confirmDeleteProduct = async () => {
    const { productId } = confirmModal;
    const productToDelete = products.find((product) => product._id === productId);
    
    setConfirmModal({ isOpen: false, productId: null });

    // Optimistic update - remove from cache
    mutate(
      (currentData) => ({
        ...currentData,
        data: currentData.data.filter((product) => product._id !== productId),
      }),
      false
    );

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Product deleted successfully');
        revalidate();
        
        // Log activity
        await logActivity({
          actionType: 'delete',
          resource: 'product',
          resourceId: productId,
          entityName: productToDelete?.name || data.data?.name || 'Unknown product',
          details: {
            summary: 'Product deleted',
          },
        });
      } else {
        revalidate();
        toast.error(data.error || 'Failed to delete product');
      }
    } catch (error) {
      revalidate();
      toast.error('An error occurred');
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleCategoryChange = (e) => {
    setCategoryFilter(e.target.value);
    setPage(1);
  };

  const handleStockChange = (e) => {
    setStockFilter(e.target.value);
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Products</h1>
            <p className="text-gray-600 mt-1">Manage your product catalog</p>
          </div>
          <button onClick={handleAddProduct} className="btn-primary">
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Product
          </button>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={handleCategoryChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={handleStockChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Stock Status</option>
              <option value="in">In Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-t-xl" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="card p-12 text-center">
            <PhotoIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No products found
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || categoryFilter || stockFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first product'}
            </p>
            <button onClick={handleAddProduct} className="btn-primary">
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Product
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <div
                  key={product._id}
                  className="card group overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  {/* Product Image */}
                  <div className="relative aspect-square bg-gray-100">
                    {product.images && product.images.length > 0 ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PhotoIcon className="w-16 h-16 text-gray-300" />
                      </div>
                    )}

                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-3 bg-white text-primary-600 rounded-full hover:bg-primary-50 transition-colors transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-75"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product._id)}
                        className="p-3 bg-white text-red-600 rounded-full hover:bg-red-50 transition-colors transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-100"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Badges */}
                    <div className="absolute top-2 right-2 flex flex-col gap-2">
                      {product.featured && (
                        <span className="px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-semibold rounded-full">
                          ⭐ Featured
                        </span>
                      )}
                      {product.topSelling && (
                        <span className="px-2 py-1 bg-purple-400 text-purple-900 text-xs font-semibold rounded-full">
                          🔥 Top Selling
                        </span>
                      )}
                      {!product.in_stock && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                          Out of Stock
                        </span>
                      )}
                      {product.in_stock && product.stock_quantity > 0 && (
                        <span className="px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                          In Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1 truncate">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {product.category_id?.name || 'No Category'}
                    </p>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-primary-600">
                          {product.price?.toLocaleString()} DZD
                        </span>
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                          <span className="text-sm text-gray-400 line-through">
                            {product.compareAtPrice?.toLocaleString()} DZD
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-500 block">
                          Stock: {product.stock_quantity || 0}
                        </span>
                        {product.variants && product.variants.length > 0 && (
                          <span className="text-xs text-gray-400">
                            {product.variants.length} variants
                          </span>
                        )}
                      </div>
                    </div>
                    {product.salesCount > 0 && (
                      <div className="text-xs text-gray-500">
                        💰 {product.salesCount} sold
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1 || loading}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-gray-600">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.pages || loading}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        product={selectedProduct}
        categories={categories}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, productId: null })}
        onConfirm={confirmDeleteProduct}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </DashboardLayout>
  );
}
