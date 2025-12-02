import axios from 'axios';

// Base URL should be the root domain without /api/v1
// All endpoint paths below will include /api/v1/...
const ECOTRACK_API_URL = process.env.ECOTRACK_API_URL || 'https://anderson-ecommerce.ecotrack.dz';
const ECOTRACK_TOKEN = process.env.ECOTRACK_TOKEN;

// Create axios instance with default config
const ecotrackClient = axios.create({
  baseURL: ECOTRACK_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add token to all requests - Use Bearer token in Authorization header
// According to ECOTRACK API documentation, some endpoints require Bearer token
ecotrackClient.interceptors.request.use((config) => {
  if (ECOTRACK_TOKEN) {
    // Use Bearer token in Authorization header (primary method)
    config.headers.Authorization = `Bearer ${ECOTRACK_TOKEN}`;
    
    // Also add token as query parameter for endpoints that require it
    // (Some endpoints may use query params, but Bearer token is more standard)
    config.params = {
      ...config.params,
      token: ECOTRACK_TOKEN,
    };
  }
  return config;
});

/**
 * Create a single order in EcoTrack
 * POST /api/v1/create/order?reference&nom_client=&telephone=&...
 * According to documentation, all parameters are passed as query parameters
 * @param {Object} orderData - Order data
 * @returns {Promise<Object>} Response with tracking number
 */
export async function createOrder(orderData) {
  try {
    // Build query parameters according to ECOTRACK API documentation
    const params = {
      reference: orderData.reference || null,
      nom_client: orderData.nom_client || '',
      telephone: orderData.telephone || '',
      telephone_2: orderData.telephone_2 || null,
      adresse: orderData.adresse || '',
      code_postal: orderData.code_postal || null,
      commune: orderData.commune || '',
      code_wilaya: orderData.code_wilaya || '',
      montant: orderData.montant || '',
      remarque: orderData.remarque || null,
      produit: orderData.produit || null,
      stock: orderData.stock !== undefined ? orderData.stock : 0,
      quantite: orderData.quantite || null,
      produit_a_recuperer: orderData.produit_a_recuperer || null,
      boutique: orderData.boutique || null,
      type: orderData.type || 1, // 1 = Livraison, 2 = Echange, 3 = PICKUP, 4 = Recouvrement
      stop_desk: orderData.stop_desk !== undefined ? orderData.stop_desk : 0, // 0 = à domicile, 1 = STOP DESK
      weight: orderData.weight || null,
      fragile: orderData.fragile !== undefined ? orderData.fragile : 0,
      gps_link: orderData.gps_link || null,
    };

    // Remove null values to match API format
    Object.keys(params).forEach(key => {
      if (params[key] === null) {
        params[key] = undefined;
      }
    });

    // Note: we include /api/v1 in the path because base URL is just the root domain
    const response = await ecotrackClient.post('/api/v1/create/order', null, { params });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('[EcoTrack] Create Order Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || { message: error.message },
    };
  }
}

/**
 * Create multiple orders in EcoTrack (batch)
 * POST /api/v1/create/orders
 * Maximum 100 orders per request
 * Body format: { "orders": { "0": {...}, "1": {...} } }
 * @param {Array<Object>} orders - Array of order objects (max 100)
 * @returns {Promise<Object>} Response with results for each order
 */
export async function createOrders(orders) {
  try {
    // Limit to 100 orders per request (EcoTrack limit)
    if (orders.length > 100) {
      return {
        success: false,
        error: { message: 'Maximum 100 orders per request' },
      };
    }

    // Convert array to indexed object format required by EcoTrack API
    // Format: { "orders": { "0": {...}, "1": {...} } }
    const ordersObject = {};
    orders.forEach((order, index) => {
      ordersObject[index.toString()] = {
        reference: order.reference || `ORDER-${Date.now()}-${index}`,
        nom_client: order.nom_client || '',
        telephone: order.telephone || '',
        telephone_2: order.telephone_2 || '',
        adresse: order.adresse || '',
        code_postal: order.code_postal || '',
        commune: order.commune || '',
        code_wilaya: order.code_wilaya || '',
        montant: order.montant || '',
        remarque: order.remarque || '',
        produit: order.produit || '',
        stock: order.stock !== undefined ? order.stock : 0,
        quantite: order.quantite || '',
        produit_a_recuperer: order.produit_a_recuperer || '',
        boutique: order.boutique || '',
        type: order.type || 1, // 1 = Livraison, 2 = Echange, 3 = PICKUP, 4 = Recouvrement
        stop_desk: order.stop_desk !== undefined ? order.stop_desk : 0, // 0 = à domicile, 1 = STOP DESK
        weight: order.weight || '',
        fragile: order.fragile !== undefined ? order.fragile : 0,
        gps_link: order.gps_link || '',
      };
    });

    // POST with JSON body containing orders object
    const response = await ecotrackClient.post('/api/v1/create/orders', {
      orders: ordersObject,
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error('[EcoTrack] Create Orders Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || { message: error.message },
    };
  }
}

/**
 * Get list of active wilayas from EcoTrack
 * @returns {Promise<Array>} List of wilayas with wilaya_id and wilaya_name
 */
export async function getWilayas() {
  try {
    console.log('[EcoTrack] Fetching wilayas from:', ECOTRACK_API_URL);
    console.log('[EcoTrack] Token present:', !!ECOTRACK_TOKEN);
    
    const response = await ecotrackClient.get('/api/v1/get/wilayas');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('[EcoTrack] Get Wilayas Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      headers: error.config?.headers,
    });
    
    return {
      success: false,
      error: error.response?.data || { message: error.message },
      statusCode: error.response?.status,
      statusText: error.response?.statusText,
    };
  }
}

/**
 * Get list of active communes from EcoTrack
 * @param {number} wilayaId - Optional wilaya ID to filter communes (1-58)
 * @returns {Promise<Array>} List of communes with commune_id, commune_name, wilaya_id
 */
export async function getCommunes(wilayaId = null) {
  try {
    console.log('[EcoTrack] Fetching communes from:', ECOTRACK_API_URL);
    console.log('[EcoTrack] Token present:', !!ECOTRACK_TOKEN);
    if (wilayaId) {
      console.log('[EcoTrack] Filtering by wilaya_id:', wilayaId);
    }
    
    const params = {};
    if (wilayaId) {
      params.wilaya_id = wilayaId;
    }
    
    const response = await ecotrackClient.get('/api/v1/get/communes', { params });

    const rawData = response.data;

    // The ECOTRACK communes endpoint returns an object with numeric keys:
    // {
    //   "0": { "nom": "Abadla", "wilaya_id": 8, "code_postal": "817", "has_stop_desk": 0 },
    //   "1": { ... }
    // }
    // Normalize this into an array of commune objects with explicit IDs.
    let communesArray = [];

    if (Array.isArray(rawData)) {
      communesArray = rawData;
    } else if (rawData && typeof rawData === 'object') {
      communesArray = Object.entries(rawData).map(([id, commune]) => ({
        commune_id: Number(id),
        commune_name: commune.nom,
        wilaya_id: commune.wilaya_id,
        code_postal: commune.code_postal,
        has_stop_desk: commune.has_stop_desk,
      }));
    }

    console.log('[EcoTrack] Normalized communes count:', communesArray.length);

    return { success: true, data: communesArray };
  } catch (error) {
    console.error('[EcoTrack] Get Communes Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      headers: error.config?.headers,
    });
    
    return {
      success: false,
      error: error.response?.data || { message: error.message },
      statusCode: error.response?.status,
      statusText: error.response?.statusText,
    };
  }
}

/**
 * Get shipping fees/tariffs from EcoTrack
 * Returns pricing for livraison, pickup, echnage, recouvrement, retours
 * Each has tarif (home delivery) and tarif_stopdesk (desk delivery)
 * @returns {Promise<Object>} Fees object with arrays for each service type
 */
export async function getFees() {
  try {
    const response = await ecotrackClient.get('/api/v1/get/fees');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('EcoTrack Get Fees Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || { message: error.message },
    };
  }
}

/**
 * Test EcoTrack API connection
 * @returns {Promise<Object>} Connection test result
 */
export async function testConnection() {
  try {
    const response = await ecotrackClient.get('/api/v1/get/wilayas');
    return {
      success: true,
      message: 'EcoTrack API connection successful',
      url: ECOTRACK_API_URL,
      hasToken: !!ECOTRACK_TOKEN,
    };
  } catch (error) {
    return {
      success: false,
      message: 'EcoTrack API connection failed',
      url: ECOTRACK_API_URL,
      hasToken: !!ECOTRACK_TOKEN,
      error: error.response?.data || error.message,
    };
  }
}

const ecotrackService = {
  createOrder,
  createOrders,
  getWilayas,
  getCommunes,
  getOrderStatus,
  testConnection,
};

export default ecotrackService;
