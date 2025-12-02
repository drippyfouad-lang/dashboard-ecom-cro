/**
 * Commune API Service
 * Handles all API calls related to communes
 */

/**
 * Get all communes with optional filters
 * @param {Object} filters - Optional filters (search, wilaya_id, is_active)
 * @returns {Promise<Object>} API response with communes data
 */
export async function getCommunes(filters = {}) {
  const params = new URLSearchParams();
  
  if (filters.search) params.append('search', filters.search);
  if (filters.wilaya_id) params.append('wilaya_id', filters.wilaya_id);
  if (typeof filters.is_active !== 'undefined') params.append('is_active', filters.is_active);
  
  const response = await fetch(`/api/communes?${params}`);
  return response.json();
}

/**
 * Get communes by wilaya ID
 * @param {string} wilayaId - Wilaya ID
 * @returns {Promise<Object>} API response with communes for specified wilaya
 */
export async function getCommunesByWilaya(wilayaId) {
  const response = await fetch(`/api/communes/by-wilaya/${wilayaId}`);
  return response.json();
}

/**
 * Get a single commune by ID
 * @param {string} communeId - Commune ID
 * @returns {Promise<Object>} API response with commune data
 */
export async function getCommuneById(communeId) {
  const response = await fetch(`/api/communes/${communeId}`);
  return response.json();
}

/**
 * Create a new commune
 * @param {Object} communeData - Commune data
 * @returns {Promise<Object>} API response
 */
export async function createCommune(communeData) {
  const response = await fetch('/api/communes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(communeData),
  });
  return response.json();
}

/**
 * Update a commune
 * @param {string} communeId - Commune ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} API response
 */
export async function updateCommune(communeId, updateData) {
  const response = await fetch(`/api/communes/${communeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });
  return response.json();
}

/**
 * Delete a commune
 * @param {string} communeId - Commune ID
 * @returns {Promise<Object>} API response
 */
export async function deleteCommune(communeId) {
  const response = await fetch(`/api/communes/${communeId}`, {
    method: 'DELETE',
  });
  return response.json();
}

/**
 * Import communes from EcoTrack
 * @returns {Promise<Object>} API response with import results
 */
export async function importCommunesFromEcoTrack() {
  const response = await fetch('/api/communes/import', {
    method: 'POST',
  });
  return response.json();
}
