/**
 * Wilaya API Service
 * Handles all API calls related to wilayas (provinces)
 */

/**
 * Get all wilayas with optional filters
 * @param {Object} filters - Optional filters (search, delivery_type, is_active)
 * @returns {Promise<Object>} API response with wilayas data
 */
export async function getWilayas(filters = {}) {
  const params = new URLSearchParams();
  
  if (filters.search) params.append('search', filters.search);
  if (filters.delivery_type) params.append('delivery_type', filters.delivery_type);
  if (typeof filters.is_active !== 'undefined') params.append('is_active', filters.is_active);
  
  const response = await fetch(`/api/wilayas?${params}`);
  return response.json();
}

/**
 * Get a single wilaya by ID
 * @param {string} wilayaId - Wilaya ID
 * @returns {Promise<Object>} API response with wilaya data
 */
export async function getWilayaById(wilayaId) {
  const response = await fetch(`/api/wilayas/${wilayaId}`);
  return response.json();
}

/**
 * Create a new wilaya
 * @param {Object} wilayaData - Wilaya data
 * @returns {Promise<Object>} API response
 */
export async function createWilaya(wilayaData) {
  const response = await fetch('/api/wilayas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(wilayaData),
  });
  return response.json();
}

/**
 * Update a wilaya
 * @param {string} wilayaId - Wilaya ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} API response
 */
export async function updateWilaya(wilayaId, updateData) {
  const response = await fetch(`/api/wilayas/${wilayaId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });
  return response.json();
}

/**
 * Delete a wilaya
 * @param {string} wilayaId - Wilaya ID
 * @returns {Promise<Object>} API response
 */
export async function deleteWilaya(wilayaId) {
  const response = await fetch(`/api/wilayas/${wilayaId}`, {
    method: 'DELETE',
  });
  return response.json();
}

/**
 * Import wilayas from EcoTrack
 * @returns {Promise<Object>} API response with import results
 */
export async function importWilayasFromEcoTrack() {
  const response = await fetch('/api/wilayas/import', {
    method: 'POST',
  });
  return response.json();
}

/**
 * Bulk update wilayas
 * @param {Array} updates - Array of wilaya updates {id, ...fields}
 * @returns {Promise<Object>} API response
 */
export async function bulkUpdateWilayas(updates) {
  const response = await fetch('/api/wilayas', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates }),
  });
  return response.json();
}
