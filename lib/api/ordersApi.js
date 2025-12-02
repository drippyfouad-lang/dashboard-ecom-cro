/**
 * Orders API Service
 * Handles all API calls related to orders
 */

/**
 * Get pending orders (non-treated)
 * @param {Object} params - Query params (page, limit, search)
 * @returns {Promise<Object>} API response with pending orders
 */
export async function getPendingOrders(params = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.search) queryParams.append('search', params.search);
  
  const response = await fetch(`/api/orders/pending?${queryParams}`);
  return response.json();
}

/**
 * Confirm an order
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} API response
 */
export async function confirmOrder(orderId) {
  const response = await fetch(`/api/orders/${orderId}/confirm`, {
    method: 'PUT',
  });
  return response.json();
}

/**
 * Mark order as no response (auto-cancels)
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} API response
 */
export async function markOrderNoResponse(orderId) {
  const response = await fetch(`/api/orders/${orderId}/mark-no-response`, {
    method: 'PUT',
  });
  return response.json();
}

/**
 * Cancel an order
 * @param {string} orderId - Order ID
 * @param {string} reason - Cancellation reason
 * @param {string} cancelledBy - User ID who cancelled
 * @returns {Promise<Object>} API response
 */
export async function cancelOrder(orderId, reason, cancelledBy) {
  const response = await fetch(`/api/orders/${orderId}/cancel`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cancellation_reason: reason, cancelled_by: cancelledBy }),
  });
  return response.json();
}

/**
 * Expediate a single order to EcoTrack
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} API response
 */
export async function expediateOrder(orderId) {
  const response = await fetch(`/api/orders/${orderId}/expediate`, {
    method: 'POST',
  });
  return response.json();
}

/**
 * Expediate multiple orders to EcoTrack (bulk)
 * @param {Array<string>} orderIds - Array of order IDs
 * @returns {Promise<Object>} API response with detailed results
 */
export async function expediteBulkOrders(orderIds) {
  const response = await fetch('/api/orders/expediate-bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderIds }),
  });
  return response.json();
}

/**
 * Get client active orders (pending through out-for-delivery)
 * @param {Object} params - Query params (page, limit, status)
 * @returns {Promise<Object>} API response with active orders
 */
export async function getClientActiveOrders(params = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.status) queryParams.append('status', params.status);
  
  const response = await fetch(`/api/orders/client/active?${queryParams}`);
  return response.json();
}

/**
 * Get client cancelled orders
 * @param {Object} params - Query params (page, limit, start_date, end_date)
 * @returns {Promise<Object>} API response with cancelled orders
 */
export async function getClientCancelledOrders(params = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.start_date) queryParams.append('start_date', params.start_date);
  if (params.end_date) queryParams.append('end_date', params.end_date);
  
  const response = await fetch(`/api/orders/client/cancelled?${queryParams}`);
  return response.json();
}

/**
 * Track order by tracking number (public, no auth)
 * @param {string} trackingNumber - EcoTrack tracking number
 * @returns {Promise<Object>} API response with order tracking info
 */
export async function trackOrder(trackingNumber) {
  const response = await fetch(`/api/orders/tracking/${trackingNumber}`);
  return response.json();
}

// Anderson Shipping Pages Endpoints

/**
 * Get pre-sent orders (confirmed, ready for expedition)
 * @param {Object} params - Query params (page, limit, search)
 * @returns {Promise<Object>} API response with pre-sent orders
 */
export async function getPreSentOrders(params = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.search) queryParams.append('search', params.search);
  
  const response = await fetch(`/api/orders/anderson/pre-sent?${queryParams}`);
  return response.json();
}

/**
 * Get sent orders (expediated to EcoTrack)
 * @param {Object} params - Query params (page, limit, search)
 * @returns {Promise<Object>} API response with sent orders
 */
export async function getSentOrders(params = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.search) queryParams.append('search', params.search);
  
  const response = await fetch(`/api/orders/anderson/sent?${queryParams}`);
  return response.json();
}

/**
 * Get shipped orders (in transit)
 * @param {Object} params - Query params (page, limit, search)
 * @returns {Promise<Object>} API response with shipped orders
 */
export async function getShippedOrders(params = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.search) queryParams.append('search', params.search);
  
  const response = await fetch(`/api/orders/anderson/shipped?${queryParams}`);
  return response.json();
}

/**
 * Get out-for-delivery orders
 * @param {Object} params - Query params (page, limit, search)
 * @returns {Promise<Object>} API response with out-for-delivery orders
 */
export async function getOutForDeliveryOrders(params = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.search) queryParams.append('search', params.search);
  
  const response = await fetch(`/api/orders/anderson/out-for-delivery?${queryParams}`);
  return response.json();
}

/**
 * Get delivered orders
 * @param {Object} params - Query params (page, limit, search, date)
 * @returns {Promise<Object>} API response with delivered orders
 */
export async function getDeliveredOrders(params = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.search) queryParams.append('search', params.search);
  if (params.date) queryParams.append('date', params.date);
  
  const response = await fetch(`/api/orders/anderson/delivered?${queryParams}`);
  return response.json();
}

/**
 * Get returned orders
 * @param {Object} params - Query params (page, limit, search, date)
 * @returns {Promise<Object>} API response with returned orders
 */
export async function getReturnedOrders(params = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.search) queryParams.append('search', params.search);
  if (params.date) queryParams.append('date', params.date);
  
  const response = await fetch(`/api/orders/anderson/returned?${queryParams}`);
  return response.json();
}

/**
 * Sync order statuses with EcoTrack
 * @returns {Promise<Object>} API response with sync results
 */
export async function syncOrderStatuses() {
  const response = await fetch('/api/orders/anderson/sync-statuses', {
    method: 'POST',
  });
  return response.json();
}
