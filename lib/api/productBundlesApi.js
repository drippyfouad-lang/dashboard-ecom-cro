/**
 * Product Bundles API Client
 * Functions for fetching and managing product bundle offers
 */

/**
 * Get all bundles for a product
 * @param {string} productId - Product ID
 * @param {Object} options - Query options (active: boolean)
 * @returns {Promise<Object>} Response with bundles array
 */
export async function getProductBundles(productId, options = {}) {
  const params = new URLSearchParams();
  if (options.active !== undefined) {
    params.append('active', options.active.toString());
  }

  const url = `/api/products/${productId}/bundles${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch bundles');
  }

  return data.data;
}

/**
 * Create a new bundle for a product
 * @param {string} productId - Product ID
 * @param {Object} bundleData - Bundle data (quantity, discount, active, startDate, endDate)
 * @returns {Promise<Object>} Created bundle
 */
export async function createProductBundle(productId, bundleData) {
  const response = await fetch(`/api/products/${productId}/bundles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bundleData),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to create bundle');
  }

  return data.data;
}

/**
 * Update a bundle
 * @param {string} bundleId - Bundle ID
 * @param {Object} bundleData - Updated bundle data
 * @returns {Promise<Object>} Updated bundle
 */
export async function updateProductBundle(bundleId, bundleData) {
  const response = await fetch(`/api/products/bundles/${bundleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bundleData),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to update bundle');
  }

  return data.data;
}

/**
 * Delete a bundle
 * @param {string} bundleId - Bundle ID
 * @returns {Promise<Object>} Deleted bundle
 */
export async function deleteProductBundle(bundleId) {
  const response = await fetch(`/api/products/bundles/${bundleId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to delete bundle');
  }

  return data.data;
}


