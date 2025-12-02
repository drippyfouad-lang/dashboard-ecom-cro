'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CategoryFormModal from '@/components/CategoryFormModal';
import ConfirmModal from '@/components/ConfirmModal';
import { useToast } from '@/hooks/useToast';
import { useCategories } from '@/hooks/useData';
import Image from 'next/image';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

export default function CategoriesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, categoryId: null, categoryName: '' });
  
  const { success, error } = useToast();

  // Build query params
  const queryParams = useMemo(() => ({
    page: page.toString(),
    limit: '12',
    search,
  }), [page, search]);

  // Fetch categories with smart caching
  const { data: categoriesData, loading, mutate, revalidate } = useCategories(queryParams);
  const categories = categoriesData?.data || [];
  const pagination = categoriesData?.pagination || null;

  const logActivity = async (payload) => {
    try {
      await fetch('/api/activity/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      error('Failed to record activity');
    }
  };

  const handleAddCategory = () => {
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  const handleEditCategory = (category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData) => {
    try {
      const url = selectedCategory ? `/api/categories/${selectedCategory._id}` : '/api/categories';
      const method = selectedCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        success(selectedCategory ? 'Category updated successfully' : 'Category created successfully');
        setIsModalOpen(false);
        revalidate();
        
        // Log activity
        await logActivity({
          actionType: selectedCategory ? 'update' : 'create',
          resource: 'category',
          resourceId: data.data?._id || selectedCategory?._id,
          entityName: formData.name,
          details: {
            summary: selectedCategory ? 'Category updated' : 'Category created',
          },
        });
      } else {
        error(data.error || 'Operation failed');
      }
    } catch (err) {
      error('Operation failed');
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    setConfirmModal({ isOpen: true, categoryId, categoryName });
  };

  const confirmDeleteCategory = async () => {
    const { categoryId, categoryName } = confirmModal;

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Optimistic update - remove from cache
        mutate(
          (currentData) => ({
            ...currentData,
            data: currentData.data.filter((category) => category._id !== categoryId),
          }),
          false
        );
        
        success('Category deleted successfully');
        revalidate();
        
        // Log activity
        await logActivity({
          actionType: 'delete',
          resource: 'category',
          resourceId: categoryId,
          entityName: categoryName,
          details: {
            summary: 'Category deleted',
          },
        });
        
        // Reset modal state after successful deletion
        setConfirmModal({ isOpen: false, categoryId: null, categoryName: '' });
      } else {
        error(data.error || 'Failed to delete category');
        throw new Error(data.error || 'Failed to delete category');
      }
    } catch (err) {
      error(err.message || 'Failed to delete category');
      throw err; // Re-throw to let ConfirmModal handle closing
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Category Management</h1>
        <p className="text-gray-600 mt-2">Manage product categories</p>
      </div>

      {/* Search and Actions */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search categories..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Add Category Button */}
          <button
            onClick={handleAddCategory}
            className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <PlusIcon className="w-5 h-5" />
            Add Category
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-lg mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <PhotoIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No categories found</p>
            <button
              onClick={handleAddCategory}
              className="mt-4 btn-primary inline-flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Create First Category
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {categories.map((category) => (
                <div
                  key={category._id}
                  className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 hover:scale-105"
                >
                  {/* Category Image */}
                  <div className="aspect-square relative bg-gray-100">
                    {category.image ? (
                      <Image
                        src={category.image}
                        alt={category.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PhotoIcon className="w-16 h-16 text-gray-300" />
                      </div>
                    )}
                    
                    {/* Action Buttons Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="p-2 bg-white rounded-lg hover:bg-primary-50 transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="w-5 h-5 text-primary-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category._id, category.name)}
                        className="p-2 bg-white rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  </div>

                  {/* Category Name */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-center truncate">
                      {category.name}
                    </h3>
                    <p className="text-xs text-gray-500 text-center mt-1">
                      {new Date(category.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {((page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} categories
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.pages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Category Form Modal */}
      <CategoryFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCategory(null);
        }}
        onSubmit={handleSubmit}
        category={selectedCategory}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, categoryId: null, categoryName: '' })}
        onConfirm={confirmDeleteCategory}
        title="Delete Category"
        message={`Are you sure you want to delete "${confirmModal.categoryName}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />
    </DashboardLayout>
  );
}
