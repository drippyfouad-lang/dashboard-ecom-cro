/**
 * EcoTrack API Integration Service
 * Documentation: https://documenter.getpostman.com/view/14517169/Tz5je15g
 */

import axios from 'axios';

// EcoTrack API Configuration
// Use the same base URL convention: root domain only, without /api/v1
const ECOTRACK_API_URL = process.env.ECOTRACK_API_URL || 'https://anderson-ecommerce.ecotrack.dz';
const ECOTRACK_TOKEN = process.env.ECOTRACK_TOKEN || 'DqbFSk5JTSMZGSewnBhe0pve68cCPjlJWPbdlTCR6je17wlQKxJH5qkiRkWn';

// Create axios instance with base configuration
const ecotrackClient = axios.create({
  baseURL: ECOTRACK_API_URL,
  headers: {
    'Authorization': `Bearer ${ECOTRACK_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor for logging
ecotrackClient.interceptors.request.use(
  (config) => {
    console.log(`[EcoTrack] ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[EcoTrack] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and logging
ecotrackClient.interceptors.response.use(
  (response) => {
    console.log(`[EcoTrack] Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Log error details
    console.error('[EcoTrack] Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });

    // Retry logic for network errors (max 3 retries)
    if (!error.response && !originalRequest._retry) {
      originalRequest._retry = (originalRequest._retry || 0) + 1;
      
      if (originalRequest._retry <= 3) {
        console.log(`[EcoTrack] Retrying request (${originalRequest._retry}/3)...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * originalRequest._retry));
        return ecotrackClient(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * EcoTrack Service Class
 */
class EcoTrackService {
  /**
   * Get all wilayas from EcoTrack
   * @returns {Promise<Array>} Array of wilaya objects
   */
  async getWilayas() {
    try {
      const response = await ecotrackClient.get('/wilayas');
      return response.data.data || response.data;
    } catch (error) {
      console.error('[EcoTrack] Error fetching wilayas:', error.message);
      throw new Error(`Failed to fetch wilayas from EcoTrack: ${error.message}`);
    }
  }

  /**
   * Get all communes from EcoTrack
   * @returns {Promise<Array>} Array of commune objects
   */
  async getCommunes() {
    try {
      const response = await ecotrackClient.get('/communes');
      return response.data.data || response.data;
    } catch (error) {
      console.error('[EcoTrack] Error fetching communes:', error.message);
      throw new Error(`Failed to fetch communes from EcoTrack: ${error.message}`);
    }
  }

  /**
   * Get communes for a specific wilaya
   * @param {string} wilayaId - EcoTrack wilaya ID
   * @returns {Promise<Array>} Array of commune objects
   */
  async getCommunesByWilaya(wilayaId) {
    try {
      const response = await ecotrackClient.get(`/wilayas/${wilayaId}/communes`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('[EcoTrack] Error fetching communes for wilaya:', error.message);
      throw new Error(`Failed to fetch communes for wilaya: ${error.message}`);
    }
  }

  /**
   * Create an expedition (ship an order)
   * @param {Object} orderData - Order data for expedition
   * @returns {Promise<Object>} Expedition response with tracking number
   */
  async expediateOrder(orderData) {
    try {
      const expeditionPayload = this._formatExpeditionData(orderData);
      
      console.log('[EcoTrack] Creating expedition:', expeditionPayload);
      
      const response = await ecotrackClient.post('/expeditions', expeditionPayload);
      
      return {
        success: true,
        ecotrackOrderId: response.data.data?.id || response.data.id,
        trackingNumber: response.data.data?.tracking_number || response.data.tracking_number,
        expeditionDate: new Date(),
        rawResponse: response.data,
      };
    } catch (error) {
      console.error('[EcoTrack] Error creating expedition:', error.response?.data || error.message);
      throw new Error(
        `Failed to expediate order: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Expediate multiple orders in batch
   * @param {Array} ordersData - Array of order data objects
   * @returns {Promise<Object>} Batch expedition results
   */
  async expediateMultipleOrders(ordersData) {
    const results = {
      total: ordersData.length,
      successful: [],
      failed: [],
    };

    // Process in batches of 5 to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < ordersData.length; i += batchSize) {
      const batch = ordersData.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (orderData) => {
        try {
          const result = await this.expediateOrder(orderData);
          results.successful.push({
            orderId: orderData.orderId,
            ...result,
          });
        } catch (error) {
          results.failed.push({
            orderId: orderData.orderId,
            error: error.message,
          });
        }
      });

      await Promise.all(batchPromises);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < ordersData.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[EcoTrack] Batch expedition complete: ${results.successful.length} successful, ${results.failed.length} failed`);
    
    return results;
  }

  /**
   * Get order status from EcoTrack
   * @param {string} ecotrackOrderId - EcoTrack order ID
   * @returns {Promise<Object>} Order status information
   */
  async getOrderStatus(ecotrackOrderId) {
    try {
      const response = await ecotrackClient.get(`/expeditions/${ecotrackOrderId}`);
      const data = response.data.data || response.data;
      
      return {
        ecotrackOrderId: data.id,
        trackingNumber: data.tracking_number,
        status: data.status,
        currentLocation: data.current_location,
        statusHistory: data.status_history || [],
        lastUpdate: data.updated_at,
      };
    } catch (error) {
      console.error('[EcoTrack] Error fetching order status:', error.message);
      throw new Error(`Failed to fetch order status: ${error.message}`);
    }
  }

  /**
   * Sync statuses for multiple orders
   * @param {Array} ecotrackOrderIds - Array of EcoTrack order IDs
   * @returns {Promise<Object>} Sync results
   */
  async syncOrderStatuses(ecotrackOrderIds) {
    const results = {
      total: ecotrackOrderIds.length,
      synced: [],
      failed: [],
    };

    for (const orderId of ecotrackOrderIds) {
      try {
        const status = await this.getOrderStatus(orderId);
        results.synced.push(status);
      } catch (error) {
        results.failed.push({
          ecotrackOrderId: orderId,
          error: error.message,
        });
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`[EcoTrack] Status sync complete: ${results.synced.length} synced, ${results.failed.length} failed`);
    
    return results;
  }

  /**
   * Map EcoTrack status to internal order status
   * @param {string} ecotrackStatus - EcoTrack status value
   * @returns {string} Internal status value
   */
  mapStatus(ecotrackStatus) {
    const statusMap = {
      'pending': 'sent',
      'accepted': 'sent',
      'collected': 'shipped',
      'in_transit': 'shipped',
      'in_hub': 'shipped',
      'out_for_delivery': 'out-for-delivery',
      'delivered': 'delivered',
      'returned_to_sender': 'returned',
      'returned': 'returned',
      'cancelled': 'cancelled',
      'failed_delivery': 'out-for-delivery', // Keep as out-for-delivery for retry
    };

    return statusMap[ecotrackStatus?.toLowerCase()] || 'sent';
  }

  /**
   * Format order data for EcoTrack expedition API
   * @private
   * @param {Object} orderData - Order data from database
   * @returns {Object} Formatted data for EcoTrack API
   */
  _formatExpeditionData(orderData) {
    return {
      // Required fields
      receiver_name: orderData.customer_name,
      receiver_phone: orderData.customer_phone,
      wilaya_id: orderData.ecotrack_wilaya_id,
      commune_id: orderData.ecotrack_commune_id || null,
      address: orderData.shipping_address || '',
      
      // Delivery details
      delivery_type: orderData.delivery_type || 'home', // 'home' or 'desk'
      
      // Package details
      cod_amount: orderData.total, // Cash on delivery amount
      declared_value: orderData.subtotal,
      weight: orderData.weight || 1, // Default 1kg if not specified
      
      // Optional fields
      description: orderData.notes || `Order #${orderData.order_number || orderData._id}`,
      reference: orderData.order_number || orderData._id.toString(),
      
      // Additional metadata
      notes: orderData.notes || '',
    };
  }

  /**
   * Test EcoTrack API connection
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    try {
      await this.getWilayas();
      console.log('[EcoTrack] Connection test successful');
      return true;
    } catch (error) {
      console.error('[EcoTrack] Connection test failed:', error.message);
      return false;
    }
  }
}

// Export singleton instance
const ecotrackService = new EcoTrackService();
export default ecotrackService;
