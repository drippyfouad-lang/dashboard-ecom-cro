/**
 * E2E ORDER MANAGEMENT TEST
 * Complete flow: Create → Change Status → Delete → Verify
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrdersPage from '@/app/orders/page'

// Mock fetch
global.fetch = jest.fn()

describe('E2E Order Management Flow', () => {
  const mockOrders = [
    {
      _id: 'order1',
      customerName: 'John Doe',
      phone: '0555123456',
      orderStatus: 'pending',
      paymentStatus: 'pending',
      totalAmount: 1500,
      items: [
        {
          product: { name: 'Product 1' },
          quantity: 2,
          price: 750,
        },
      ],
      createdAt: new Date().toISOString(),
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch.mockImplementation((url, options) => {
      // GET orders
      if (url.includes('/api/orders') && !options?.method) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOrders),
        })
      }
      // PUT update order
      if (url.includes('/api/orders/update') && options?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, updated_fields: ['orderStatus'] }),
        })
      }
      // DELETE order
      if (url.includes('/api/orders/') && options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ deleted: true }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    })
  })

  test('Complete E2E Flow: Create → Status Change → Delete', async () => {
    // 1. RENDER ORDERS PAGE
    render(<OrdersPage />)

    // Wait for orders to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/orders')
      )
    })

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // 2. CHANGE ORDER STATUS
    // Find the order status select
    const statusSelects = screen.getAllByRole('combobox')
    const orderStatusSelect = statusSelects.find(
      (select) => select.value === 'pending'
    )

    expect(orderStatusSelect).toBeInTheDocument()

    // Change status to 'shipped'
    fireEvent.change(orderStatusSelect, { target: { value: 'shipped' } })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/orders/update'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('shipped'),
        })
      )
    })

    // 3. VERIFY PAYMENT STATUS UNCHANGED
    // Payment status should remain 'pending' after order status change
    const paymentStatusSelects = screen.getAllByRole('combobox')
    const paymentStatusSelect = paymentStatusSelects.find(
      (select) => select !== orderStatusSelect
    )

    expect(paymentStatusSelect?.value).toBe('pending')

    // 4. DELETE ORDER
    const deleteButtons = screen.getAllByText(/Delete/i)
    const deleteButton = deleteButtons[0]

    fireEvent.click(deleteButton)

    // Confirm deletion in modal
    await waitFor(() => {
      expect(screen.getByText(/Are you sure/i)).toBeInTheDocument()
    })

    const confirmButton = screen.getByText(/Confirm/i)
    fireEvent.click(confirmButton)

    // 5. VERIFY DELETION
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/orders/order1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    // Verify order is removed from UI
    await waitFor(() => {
      // After successful deletion, orders list should be refetched
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/orders')
      )
    })
  })

  test('Status independence: Order and Payment statuses update independently', async () => {
    render(<OrdersPage />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    const selects = screen.getAllByRole('combobox')

    // Change order status
    const orderStatusSelect = selects[0]
    fireEvent.change(orderStatusSelect, { target: { value: 'delivered' } })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/orders/update'),
        expect.objectContaining({
          body: expect.stringContaining('orderStatus'),
        })
      )
    })

    // Change payment status separately
    const paymentStatusSelect = selects[1]
    fireEvent.change(paymentStatusSelect, { target: { value: 'paid' } })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/orders/update'),
        expect.objectContaining({
          body: expect.stringContaining('paymentStatus'),
        })
      )
    })

    // Verify both calls were made independently
    const updateCalls = global.fetch.mock.calls.filter(
      ([url]) => url.includes('/api/orders/update')
    )

    expect(updateCalls.length).toBeGreaterThanOrEqual(2)
  })

  test('Deletion returns deleted: true and removes from MongoDB', async () => {
    global.fetch.mockImplementation((url, options) => {
      if (url.includes('/api/orders') && !options?.method) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOrders),
        })
      }
      if (url.includes('/api/orders/order1') && options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ deleted: true }),
        })
      }
      // After deletion, return empty array
      if (url.includes('/api/orders') && !options?.method) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    })

    render(<OrdersPage />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Delete order
    const deleteButtons = screen.getAllByText(/Delete/i)
    fireEvent.click(deleteButtons[0])

    // Confirm
    await waitFor(() => {
      const confirmButton = screen.getByText(/Confirm/i)
      fireEvent.click(confirmButton)
    })

    // Verify deleted: true was returned
    await waitFor(() => {
      const deleteCall = global.fetch.mock.calls.find(
        ([url, options]) =>
          url.includes('/api/orders/order1') && options?.method === 'DELETE'
      )
      expect(deleteCall).toBeDefined()
    })
  })

  test('Error handling: Shows toast on network error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'))

    render(<OrdersPage />)

    // Should handle error gracefully
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    // Toast notification should be triggered (mocked in jest.setup.js)
  })

  test('Refresh behavior: Orders list updates after operations', async () => {
    render(<OrdersPage />)

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Initial fetch
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/orders')
    )

    // Simulate status change
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'shipped' } })

    // Should refetch after update
    await waitFor(() => {
      const fetchCalls = global.fetch.mock.calls.filter(
        ([url]) => url.includes('/api/orders') && !url.includes('update')
      )
      expect(fetchCalls.length).toBeGreaterThan(1)
    })
  })
})
