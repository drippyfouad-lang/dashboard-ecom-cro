/**
 * Central API Services Export
 * Import all API services from this file
 * 
 * Example usage:
 * import { wilayasApi, communesApi, ordersApi } from '@/lib/api';
 * 
 * const wilayas = await wilayasApi.getWilayas();
 * const communes = await communesApi.getCommunesByWilaya(wilayaId);
 * const orders = await ordersApi.getPendingOrders({ page: 1, limit: 20 });
 */

import * as wilayasApi from './wilayasApi';
import * as communesApi from './communesApi';
import * as ordersApi from './ordersApi';
import * as productBundlesApi from './productBundlesApi';

export { wilayasApi, communesApi, ordersApi, productBundlesApi };

// Individual exports for convenience
export * from './wilayasApi';
export * from './communesApi';
export * from './ordersApi';
export * from './productBundlesApi';
