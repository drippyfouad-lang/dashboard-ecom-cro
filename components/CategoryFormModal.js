'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import { useToast } from '@/hooks/useToast';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

const CategoryFormModal = ({ isOpen, onClose, onSubmit, category }) => {
  const [formData, setFormData] = useState({
    name: '',
    image: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        image: category.image || '',
      });
      setImagePreview(category.image || '');
      setImageFile(null);
    } else {
      setFormData({ name: '', image: '' });
      setImagePreview('');
      setImageFile(null);
    }
  }, [category, isOpen]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData({ ...formData, image: '' });
  };

  const uploadImage = async () => {
    if (!imageFile) return formData.image;

    // Validate file size (max 5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
      toast.error('Image upload failed', 'Image size must be less than 5MB');
      throw new Error('Image size must be less than 5MB');
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(imageFile);
      });

      const base64 = await base64Promise;

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: base64, folder: 'categories' }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text.includes('too large') || text.includes('Too Large') 
          ? 'Image size exceeds server limit. Please use a smaller image.' 
          : `Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        return data.data.url;
      } else {
        throw new Error(data.error || 'Upload failed');
      }
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
      // Upload image if new file selected
      const imageUrl = await uploadImage();
      
      const submitData = {
        ...formData,
        image: imageUrl,
        oldImage: category?.image || '',
      };

      await onSubmit(submitData);
      onClose();
      toast.success(category ? 'Category updated successfully' : 'Category created successfully');
    } catch (error) {
      toast.error('Failed to save category', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={category ? 'Edit Category' : 'Add New Category'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Enter category name"
            required
          />
        </div>

        {/* Category Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category Image
          </label>
          
          {/* Image Preview */}
          {imagePreview ? (
            <div className="relative w-full h-48 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
              <Image
                src={imagePreview}
                alt="Preview"
                fill
                className="object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                aria-label="Remove image"
                title="Remove image"
              >
                <XMarkIcon className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="category-image"
              />
              <label
                htmlFor="category-image"
                className="cursor-pointer flex flex-col items-center"
              >
                <PhotoIcon className="w-12 h-12 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  PNG, JPG, GIF up to 5MB
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Submit Button */}
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
            {uploading ? 'Uploading...' : loading ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CategoryFormModal;
