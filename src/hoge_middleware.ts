import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // App Router middleware implementation for authentication
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and auth routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  // For non-API routes, check if user is authenticated via cookies
  if (pathname.startsWith('/api/')) {
    const sessionCookie = request.cookies.get('session');

    if (!sessionCookie && pathname !== '/auth') {
      // Redirect to auth page if not authenticated
      const url = new URL('/auth', request.url);
      return NextResponse.redirect(url);
    }

    // If we have a session cookie, verify it
    if (sessionCookie) {
      try {
        // Initialize Firebase Admin SDK if not already initialized
        if (getApps().length === 0) {
          initializeApp();
        }

        const auth = getAuth();
        await auth.verifySessionCookie(sessionCookie.value, true);

        // Session is valid, continue with the request
        return NextResponse.next();
      } catch (_error) {
        // Invalid session, redirect to auth page (top page)
        const url = new URL('/auth', request.url);
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  }

  // For API routes (except auth), authentication is handled by individual routes
  // This allows each route to implement its own authentication logic
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
