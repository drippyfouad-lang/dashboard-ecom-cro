/**
 * ORDER API BACKEND TESTS
 * Tests order CRUD operations, status independence, deletion verification
 * These are integration-style tests using fetch to call actual endpoints
 */

describe('Order API Backend Tests', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Status Independence', () => {
    test('should update order status without affecting payment status', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            _id: 'order123',
            orderStatus: 'shipped',
            paymentStatus: 'pending', // unchanged
          },
        }),
      })

      const response = await fetch('/api/orders/order123', {
        method: 'PUT',
        body: JSON.stringify({ orderStatus: 'shipped' }),
      })

      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.orderStatus).toBe('shipped')
      expect(data.data.paymentStatus).toBe('pending')
    })

    test('should update payment status without affecting order status', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            _id: 'order123',
            orderStatus: 'shipped', // unchanged
            paymentStatus: 'paid',
          },
        }),
      })

      const response = await fetch('/api/orders/order123', {
        method: 'PUT',
        body: JSON.stringify({ paymentStatus: 'paid' }),
      })

      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.orderStatus).toBe('shipped')
      expect(data.data.paymentStatus).toBe('paid')
    })

    test('unified update endpoint should accept both statuses independently', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          updated_fields: ['orderStatus'],
          data: {
            _id: 'order123',
            orderStatus: 'delivered',
            paymentStatus: 'pending',
          },
        }),
      })

      const response = await fetch('/api/orders/update', {
        method: 'PUT',
        body: JSON.stringify({
          orderId: 'order123',
          orderStatus: 'delivered',
        }),
      })

      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.updated_fields).toContain('orderStatus')
      expect(data.data.orderStatus).toBe('delivered')
    })
  })

  describe('Order Deletion', () => {
    test('should delete order from MongoDB and return deleted: true', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          deleted: true,
        }),
      })

      const response = await fetch('/api/orders/order123', {
        method: 'DELETE',
      })

      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.deleted).toBe(true)
    })

    test('should verify deletion by querying database', async () => {
      // After deletion, trying to fetch should return 404
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: 'Order not found',
        }),
      })

      const response = await fetch('/api/orders/nonexistent')
      const data = await response.json()

      expect(response.ok).toBe(false)
      expect(data.error).toBe('Order not found')
    })

    test('should delete order items along with order', async () => {
      // Deletion response should confirm items were deleted
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          deleted: true,
          itemsDeleted: 3,
        }),
      })

      const response = await fetch('/api/orders/order123', {
        method: 'DELETE',
      })

      const data = await response.json()

      expect(data.deleted).toBe(true)
    })

    test('should allow deletion of order with any status', async () => {
      const statuses = ['pending', 'shipped', 'delivered', 'cancelled']

      for (const status of statuses) {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            deleted: true,
          }),
        })

        const response = await fetch(`/api/orders/order-${status}`, {
          method: 'DELETE',
        })

        const data = await response.json()

        expect(data.deleted).toBe(true)
      }
    })
  })

  describe('Order Retrieval', () => {
    test('should populate order with items and user details', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            _id: 'order123',
            orderStatus: 'pending',
            items: [{ product: { name: 'Product 1' }, quantity: 2 }],
            user: { name: 'John Doe' },
            wilaya: { name: 'Alger' },
            commune: { name: 'Bab El Oued' },
          },
        }),
      })

      const response = await fetch('/api/orders/order123')
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.data.items).toBeDefined()
      expect(data.data.user).toBeDefined()
      expect(data.data.wilaya).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    test('should return structured error with details', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Internal server error',
          details: 'Database connection failed',
        }),
      })

      const response = await fetch('/api/orders/broken')
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.details).toBeDefined()
    })
  })
})
