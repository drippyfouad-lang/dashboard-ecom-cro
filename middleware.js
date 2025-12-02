import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const userRole = token?.role?.toLowerCase();

    // Pages restricted to admin only
    const adminOnlyPages = ['/users', '/finance', '/activity'];
    
    // Check if moderator is trying to access admin-only pages
    if (userRole === 'moderator') {
      for (const adminPath of adminOnlyPages) {
        if (path.startsWith(adminPath)) {
          return NextResponse.redirect(new URL('/', req.url));
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/',
    '/users/:path*',
    '/categories/:path*',
    '/products/:path*',
    '/orders/:path*',
    '/shipping/:path*',
    '/finance/:path*',
    '/activity/:path*',
    '/client-tracking/:path*',
    '/contact/:path*',
  ],
};
