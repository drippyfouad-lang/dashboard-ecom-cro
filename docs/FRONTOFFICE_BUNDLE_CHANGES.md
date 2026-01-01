# Front Office Changes for Product Bundle Offers

## Overview
This document outlines the changes needed in the front office (customer-facing e-commerce site) to support the Product Bundle Offers feature that was implemented in the admin dashboard.

## API Endpoints Available

The following endpoints are available for the front office to consume:

### Get Product Bundles
```
GET /api/products/[id]/bundles?active=true
```
Returns all active bundles for a specific product. The `active=true` query parameter filters for active bundles only.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "bundle_id",
      "productId": "product_id",
      "quantity": 3,
      "discount": 50,
      "active": true,
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T23:59:59.000Z",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Order Creation (Already Updated)
The order creation endpoint (`POST /api/orders`) already includes bundle discount calculation. The response includes:
- `bundleDiscount`: Total discount amount applied
- `bundleDetails`: Array of bundles that were applied

## Required Front Office Changes

### 1. Product Detail Page

#### Display Bundle Offers
- **Location**: Product detail page, below product price or in a dedicated "Special Offers" section
- **Display Format**: 
  - Show active bundle offers for the product
  - Display: "Buy X, Save Y DZD"
  - Show original price vs. discounted price
  - Display date range if applicable
  - Example: "Buy 3, Save 50 DZD - Original: 300 DZD → New: 250 DZD"

#### Implementation Steps:
1. Fetch bundles when product page loads:
   ```javascript
   const bundles = await fetch(`/api/products/${productId}/bundles?active=true`);
   ```
2. Filter bundles by date validity (startDate <= now <= endDate)
3. Display bundle offers in a visually appealing card/component
4. Sort bundles by quantity (ascending) to show best deals first

### 2. Shopping Cart / Cart Page

#### Show Applicable Bundle Discounts
- **Location**: Cart page, in the cart summary section
- **Display Format**:
  - Show which products have bundle discounts applied
  - Display savings amount per product
  - Show total bundle savings
  - Example: "Bundle Discount Applied: -50 DZD (Buy 3 of Product X)"

#### Implementation Steps:
1. When cart items change, calculate total quantity per product
2. For each product, fetch active bundles and find matching bundle
3. Display bundle discount information in cart summary
4. Show potential savings if customer adds more items to qualify

### 3. Checkout Process

#### Display Bundle Discounts
- **Location**: Checkout page, in order summary section
- **Display Format**:
  ```
  Subtotal: 1000 DZD
  Bundle Discount: -50 DZD
  Shipping: 200 DZD
  Total: 1150 DZD
  ```

#### Implementation Steps:
1. Before submitting order, calculate bundle discounts client-side for preview
2. Display bundle discount line item in order summary
3. Show which bundles were applied (optional: expandable details)
4. The server will recalculate and apply discounts, but showing preview improves UX

### 4. Product Listing Pages

#### Show Bundle Badge/Indicator
- **Location**: Product cards in listing/grid views
- **Display Format**: 
  - Small badge/icon indicating bundle offers available
  - Example: "🎁 Bundle Offers" badge or "Save up to X DZD" text

#### Implementation Steps:
1. Fetch active bundles for products in the listing (batch request or per product)
2. Add visual indicator to product cards that have active bundles
3. Consider showing the best bundle offer (highest discount or lowest quantity threshold)

### 5. Cart Quantity Updates

#### Real-time Bundle Calculation
- **Location**: Cart page, when user changes quantities
- **Behavior**:
  - Recalculate bundle eligibility when quantity changes
  - Show/hide bundle discount messages dynamically
  - Update total savings in real-time

#### Implementation Steps:
1. Add event listeners to quantity inputs
2. On quantity change, recalculate bundle matches
3. Update UI to reflect new bundle discounts
4. Provide feedback: "Add 2 more to save X DZD" messages

## Bundle Matching Logic (Client-Side Preview)

For client-side preview calculations, use this logic:

```javascript
function findBestBundle(bundles, quantity) {
  const now = new Date();
  
  // Filter active bundles that match quantity
  const validBundles = bundles.filter(bundle => {
    // Check if bundle is active
    if (!bundle.active) return false;
    
    // Check quantity threshold
    if (bundle.quantity > quantity) return false;
    
    // Check date validity
    if (bundle.startDate && new Date(bundle.startDate) > now) return false;
    if (bundle.endDate && new Date(bundle.endDate) < now) return false;
    
    return true;
  });
  
  // Sort by quantity descending (best match = highest quantity <= order quantity)
  validBundles.sort((a, b) => b.quantity - a.quantity);
  
  // Return best matching bundle (first one)
  return validBundles[0] || null;
}
```

## UI/UX Recommendations

### Visual Design
- Use distinct colors for bundle offers (e.g., green for savings, blue for offers)
- Make bundle information prominent but not overwhelming
- Use icons: 🎁 for bundles, 💰 for savings

### User Messaging
- Clear messaging: "Buy X, Save Y DZD"
- Show value: "You save X DZD with this bundle!"
- Urgency: "Limited time offer" if endDate is near
- Progress indicators: "Add 2 more to unlock bundle discount"

### Error Handling
- Handle cases where bundle API is unavailable gracefully
- Don't block checkout if bundle calculation fails
- Show fallback pricing if bundle data can't be loaded

## Example Component Structure

### BundleOfferCard Component
```javascript
// components/BundleOfferCard.js
export function BundleOfferCard({ bundle, productPrice }) {
  const originalPrice = productPrice * bundle.quantity;
  const newPrice = originalPrice - bundle.discount;
  const savings = bundle.discount;
  
  return (
    <div className="bundle-offer-card">
      <h4>Bundle Offer</h4>
      <p>Buy {bundle.quantity}, Save {savings} DZD</p>
      <div>
        <span className="original-price">{originalPrice} DZD</span>
        <span className="new-price">{newPrice} DZD</span>
      </div>
      {bundle.endDate && (
        <p className="expiry">Valid until {formatDate(bundle.endDate)}</p>
      )}
    </div>
  );
}
```

### CartBundleDiscount Component
```javascript
// components/CartBundleDiscount.js
export function CartBundleDiscount({ cartItems, bundles }) {
  const bundleDiscounts = calculateBundleDiscounts(cartItems, bundles);
  const totalSavings = bundleDiscounts.reduce((sum, b) => sum + b.discount, 0);
  
  if (totalSavings === 0) return null;
  
  return (
    <div className="cart-bundle-discount">
      <h4>Bundle Savings</h4>
      {bundleDiscounts.map(b => (
        <div key={b.productId}>
          {b.productName}: -{b.discount} DZD
        </div>
      ))}
      <div className="total-savings">
        Total Savings: {totalSavings} DZD
      </div>
    </div>
  );
}
```

## Testing Checklist

- [ ] Bundle offers display correctly on product detail pages
- [ ] Bundle badges show on product listing pages
- [ ] Cart shows bundle discounts when applicable
- [ ] Checkout displays bundle discounts in order summary
- [ ] Bundle discounts calculate correctly for multiple products
- [ ] Date filtering works (bundles don't show outside date range)
- [ ] Inactive bundles don't display
- [ ] Quantity changes update bundle eligibility in real-time
- [ ] Best bundle is selected when multiple bundles match
- [ ] Order creation includes bundle discounts (verified via API response)

## Performance Considerations

1. **Batch Bundle Requests**: If showing bundles on listing pages, consider:
   - Fetching bundles for visible products only
   - Using a batch endpoint (if created) instead of individual requests
   - Caching bundle data client-side

2. **Lazy Loading**: Load bundle data only when needed (e.g., when product detail page opens)

3. **Debouncing**: When calculating bundles on quantity changes, debounce the calculation to avoid excessive API calls

## Security Notes

- The bundle API endpoints require authentication in the admin panel
- For front office, you may need to create public endpoints or modify authentication
- Consider creating public endpoints like `/api/public/products/[id]/bundles` that don't require auth
- Ensure bundle discounts are recalculated server-side during order creation (already implemented)

## Migration Notes

- Existing orders will have `bundleDiscount: 0` (no breaking changes)
- New orders will automatically include bundle discounts if applicable
- No database migration needed for front office changes (only UI/API consumption)

## Next Steps

1. Create public bundle API endpoints (if authentication is required)
2. Implement bundle display components
3. Integrate bundle calculation into cart/checkout flow
4. Add bundle indicators to product listings
5. Test bundle matching logic with various scenarios
6. Deploy and monitor bundle offer performance


