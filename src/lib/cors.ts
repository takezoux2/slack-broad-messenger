import { NextResponse } from 'next/server';

/**
 * CORS configuration for App Router API routes
 */
export interface CorsOptions {
  origin?: string | string[];
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
}

const defaultCorsOptions: CorsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://slack-broad-messenger.vercel.app',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

/**
 * Adds CORS headers to a NextResponse
 */
export function addCorsHeaders(
  response: NextResponse,
  options: CorsOptions = defaultCorsOptions
): NextResponse {
  // Handle origin
  if (options.origin) {
    if (Array.isArray(options.origin)) {
      response.headers.set('Access-Control-Allow-Origin', options.origin.join(','));
    } else {
      response.headers.set('Access-Control-Allow-Origin', options.origin);
    }
  }

  // Handle methods
  if (options.methods) {
    response.headers.set('Access-Control-Allow-Methods', options.methods.join(','));
  }

  // Handle allowed headers
  if (options.allowedHeaders) {
    response.headers.set('Access-Control-Allow-Headers', options.allowedHeaders.join(','));
  }

  // Handle credentials
  if (options.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

/**
 * Creates a CORS-enabled NextResponse with JSON data
 */
export function createCorsResponse<T>(
  data: T,
  init?: ResponseInit,
  corsOptions?: CorsOptions
): NextResponse<T> {
  const response = NextResponse.json(data, init);
  return addCorsHeaders(response, corsOptions) as NextResponse<T>;
}

/**
 * Handles OPTIONS preflight requests for CORS
 */
export function handleCorsPreflightRequest(corsOptions?: CorsOptions): NextResponse {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response, corsOptions);
}

/**
 * Security headers for App Router API routes
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Strict Transport Security (HTTPS only)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'"
  );

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

/**
 * Creates a complete response with CORS and security headers
 */
export function createSecureResponse<T>(
  data: T,
  init?: ResponseInit,
  corsOptions?: CorsOptions
): NextResponse<T> {
  const response = createCorsResponse(data, init, corsOptions);
  return addSecurityHeaders(response) as NextResponse<T>;
}
