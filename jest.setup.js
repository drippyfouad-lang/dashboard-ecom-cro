// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession() {
    return {
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
        },
      },
      status: 'authenticated',
    }
  },
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

// Mock fetch globally
global.fetch = jest.fn()

// Mock toast notifications
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
}

jest.mock('./hooks/useToast', () => ({
  __esModule: true,
  default: () => mockToast,
  useToast: () => mockToast,
}))
