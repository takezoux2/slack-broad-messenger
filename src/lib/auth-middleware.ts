import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

/**
 * Extended NextApiRequest with authenticated user information
 */
export interface AuthenticatedApiRequest extends NextApiRequest {
  user: {
    uid: string;
    email: string;
    emailVerified: boolean;
    customClaims?: Record<string, any>;
  };
}

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: any;
}

/**
 * HTTP status codes for API responses
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Initialize Firebase Admin SDK if not already initialized
 */
function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      throw new Error(
        'Missing Firebase Admin SDK configuration. Please check environment variables.'
      );
    }

    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });
  }
}

/**
 * Extracts Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/);
  return match ? match[1] : null;
}

/**
 * Verifies Firebase ID token and returns user information
 */
async function verifyIdToken(idToken: string) {
  try {
    initializeFirebaseAdmin();
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      emailVerified: decodedToken.email_verified || false,
      customClaims: decodedToken.custom_claims || {},
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Sends standardized error response
 */
export function sendErrorResponse(
  res: NextApiResponse,
  status: number,
  error: string,
  message: string,
  details?: any
): void {
  res.status(status).json({
    error,
    message,
    ...(details && { details }),
  });
}

/**
 * Sends standardized success response
 */
export function sendSuccessResponse(
  res: NextApiResponse,
  data: any,
  status: number = HTTP_STATUS.OK
): void {
  res.status(status).json(data);
}

/**
 * Middleware to authenticate API requests using Firebase Auth
 */
export function withAuth(
  handler: (req: AuthenticatedApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Extract token from Authorization header
      const token = extractBearerToken(req.headers.authorization);

      if (!token) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.UNAUTHORIZED,
          'missing_token',
          'Authorization token is required'
        );
      }

      // Verify token and get user information
      const user = await verifyIdToken(token);

      // Add user information to request
      const authenticatedReq = req as AuthenticatedApiRequest;
      authenticatedReq.user = user;

      // Call the actual handler
      return handler(authenticatedReq, res);
    } catch (error) {
      console.error('Authentication middleware error:', error);

      return sendErrorResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        'authentication_failed',
        error instanceof Error ? error.message : 'Authentication failed'
      );
    }
  };
}

/**
 * Middleware to validate HTTP methods
 */
export function withMethods(allowedMethods: string[]) {
  return function (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      if (!req.method || !allowedMethods.includes(req.method)) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.METHOD_NOT_ALLOWED,
          'method_not_allowed',
          `Method ${req.method} is not allowed. Allowed methods: ${allowedMethods.join(', ')}`
        );
      }

      return handler(req, res);
    };
  };
}

/**
 * Middleware to validate request body
 */
export function withValidation<T>(
  validator: (body: any) => { isValid: boolean; errors?: string[] }
) {
  return function (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const validation = validator(req.body);

      if (!validation.isValid) {
        return sendErrorResponse(
          res,
          HTTP_STATUS.BAD_REQUEST,
          'validation_error',
          'Request validation failed',
          { errors: validation.errors }
        );
      }

      return handler(req, res);
    };
  };
}

/**
 * Middleware to handle CORS
 */
export function withCors(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    return handler(req, res);
  };
}

/**
 * Middleware to handle errors consistently
 */
export function withErrorHandling(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      return await handler(req, res);
    } catch (error) {
      console.error('API handler error:', error);

      // Don't expose internal errors in production
      const message =
        process.env.NODE_ENV === 'development'
          ? error instanceof Error
            ? error.message
            : 'Unknown error'
          : 'Internal server error';

      return sendErrorResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'internal_error', message);
    }
  };
}

/**
 * Utility to compose multiple middleware functions
 */
export function compose(...middlewares: Array<(handler: any) => any>) {
  return (handler: any) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}

/**
 * Common middleware stack for authenticated API routes
 */
export function withApiDefaults(
  handler: (req: AuthenticatedApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return compose(withErrorHandling, withCors, withAuth)(handler);
}

/**
 * Common middleware stack for public API routes
 */
export function withPublicApiDefaults(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return compose(withErrorHandling, withCors)(handler);
}

/**
 * Validates that required environment variables are set
 */
export function validateEnvVars(): void {
  const requiredVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
        'Please check your .env.local file and ensure all Firebase Admin SDK variables are set.'
    );
  }
}

/**
 * Type guard to check if request is authenticated
 */
export function isAuthenticatedRequest(req: NextApiRequest): req is AuthenticatedApiRequest {
  return 'user' in req && typeof (req as any).user === 'object';
}

/**
 * Utility to get user ID from authenticated request
 */
export function getUserId(req: AuthenticatedApiRequest): string {
  return req.user.uid;
}

/**
 * Utility to get user email from authenticated request
 */
export function getUserEmail(req: AuthenticatedApiRequest): string {
  return req.user.email;
}

/**
 * Rate limiting utility (basic implementation)
 */
export function withRateLimit(
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return function (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const clientId = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const now = Date.now();

      const clientData = requests.get(clientId as string);

      if (!clientData || now > clientData.resetTime) {
        // Reset window
        requests.set(clientId as string, {
          count: 1,
          resetTime: now + windowMs,
        });
      } else if (clientData.count >= maxRequests) {
        // Rate limit exceeded
        return sendErrorResponse(
          res,
          429, // Too Many Requests
          'rate_limit_exceeded',
          'Too many requests. Please try again later.'
        );
      } else {
        // Increment count
        clientData.count++;
      }

      return handler(req, res);
    };
  };
}
