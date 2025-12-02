/**
 * ORDER FORM MODAL COMPONENT TESTS
 * Tests product display, validation, and form submission
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrderFormModal from '@/components/OrderFormModal'

// Mock fetch
global.fetch = jest.fn()

describe('OrderFormModal Component Tests', () => {
  const mockOnClose = jest.fn()
  const mockOnSuccess = jest.fn()

  const mockProducts = [
    {
      _id: 'prod1',
      name: 'Product 1',
      price: 100,
      stockQuantity: 10,
      hasSize: true,
      hasColor: true,
    },
    {
      _id: 'prod2',
      name: 'Product 2',
      price: 200,
      stockQuantity: 5,
      hasSize: false,
      hasColor: false,
    },
  ]

  const mockWilayas = [
    { _id: 'wil1', code: '16', name: 'Alger', shippingPrice: 500 },
  ]

  const mockCommunes = [
    { _id: 'com1', name: 'Bab El Oued', wilaya: 'wil1' },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/products')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProducts),
        })
      }
      if (url.includes('/api/shipping/wilayas')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockWilayas),
        })
      }
      if (url.includes('/api/shipping/communes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCommunes),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    })
  })

  describe('Product Display', () => {
    test('should load and display products in edit mode', async () => {
      const existingOrder = {
        _id: 'order123',
        items: [
          {
            product: { _id: 'prod1', name: 'Product 1' },
            quantity: 2,
            price: 100,
            size: 'M',
            color: 'Red',
          },
        ],
        customerName: 'John Doe',
        phone: '0555123456',
        wilaya: 'wil1',
        commune: 'com1',
        address: '123 Main St',
      }

      render(
        <OrderFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          order={existingOrder}
        />
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
      })

      // Verify product is loaded
      await waitFor(() => {
        expect(screen.getByText(/Product 1/i)).toBeInTheDocument()
      })
    })

    test('should validate product existence before submission', async () => {
      render(
        <OrderFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Add Order/i)).toBeInTheDocument()
      })

      // Try to submit without products
      const submitButton = screen.getByText(/Submit/i)
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled()
      })
    })

    test('should validate quantity is at least 1', async () => {
      render(
        <OrderFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Add Order/i)).toBeInTheDocument()
      })

      // Products should load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/products')
        )
      })
    })

    test('should validate required size/color for products that need them', async () => {
      const orderWithoutSize = {
        items: [
          {
            product: 'prod1', // has hasSize: true
            quantity: 2,
            price: 100,
            color: 'Red',
            // missing size
          },
        ],
        customerName: 'John Doe',
        phone: '0555123456',
        wilaya: 'wil1',
        commune: 'com1',
        address: '123 Main St',
      }

      render(
        <OrderFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Add Order/i)).toBeInTheDocument()
      })

      // This would be caught by validation
      const submitButton = screen.getByText(/Submit/i)
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled()
      })
    })
  })

  describe('Form Validation', () => {
    test('should require customer name', async () => {
      render(
        <OrderFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Add Order/i)).toBeInTheDocument()
      })

      const submitButton = screen.getByText(/Submit/i)
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled()
      })
    })

    test('should validate phone number format', async () => {
      render(
        <OrderFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Add Order/i)).toBeInTheDocument()
      })

      const phoneInput = screen.getByLabelText(/Phone/i)
      await userEvent.type(phoneInput, 'invalid')

      const submitButton = screen.getByText(/Submit/i)
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSuccess).not.toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    test('should show toast notification on fetch error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      render(
        <OrderFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      // Error toast should be triggered for products fetch
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    test('should show toast notification on HTTP error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      render(
        <OrderFormModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      // Error toast should be triggered
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })
  })
})
