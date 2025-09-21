# Research: Next.js Pages Router to App Router Migration

## Migration Strategy

### Decision: Incremental Migration with Parallel Structure

**Rationale**: App Router can coexist with Pages Router during migration, allowing route-by-route migration without downtime.

**Alternatives considered**:

- Complete rewrite: Too risky, unnecessary complexity
- Keep Pages Router: Misses benefits of App Router (better TypeScript, performance, features)

### Route Handler Conversion Pattern

**Decision**: Convert `/pages/api/` handlers to `/app/api/` route handlers using new `route.ts` pattern

**Key Changes**:

- `export default function handler(req, res)` → `export async function GET/POST(request)`
- `req.query` → `request.nextUrl.searchParams` or `params` object
- `req.body` → `await request.json()`
- `res.status(200).json({})` → `return NextResponse.json({})`

### Authentication Middleware Migration

**Decision**: Convert existing middleware to App Router middleware pattern

**Rationale**: App Router middleware runs at edge runtime, requires different implementation

- Pages Router: Custom middleware functions in API routes
- App Router: middleware.ts file with matcher configuration

### Error Handling Preservation

**Decision**: Maintain identical error response formats using App Router error boundaries

**Pattern**:

- Preserve HTTP status codes
- Maintain error message structures
- Use `NextResponse.json()` with same status codes

## Technology Research

### Next.js App Router Features Used

**Route Handlers**:

- Support for all HTTP methods (GET, POST, PUT, DELETE, etc.)
- Native TypeScript support with better type inference
- Edge runtime compatibility

**Middleware**:

- `middleware.ts` in project root
- `matcher` config for route-specific middleware
- Edge runtime for better performance

**Request/Response Objects**:

- Web standard Request/Response APIs
- Better streaming support
- Improved TypeScript types

### Firebase Integration Compatibility

**Decision**: No changes required to Firebase integration

**Rationale**: Firebase SDK works identically with App Router route handlers

- Authentication checks remain the same
- Firestore operations unchanged
- Admin SDK usage patterns preserved

### Testing Approach

**Decision**: Update existing contract tests to work with new route structure

**Migration Pattern**:

1. Keep existing test logic
2. Update import paths from `/pages/api/` to `/app/api/`
3. Verify identical request/response behavior
4. Add specific App Router route handler tests

## Migration Sequence

### Phase A: Preparation

1. Create `/app/api/` directory structure
2. Set up route handler templates
3. Update TypeScript paths if needed

### Phase B: Route-by-Route Migration

1. Convert simple GET routes first
2. Migrate POST routes with request body handling
3. Convert complex routes with middleware
4. Update authentication-protected routes

### Phase C: Cleanup

1. Remove old `/pages/api/` routes after verification
2. Update any internal references
3. Clean up unused middleware patterns

## Risk Mitigation

### Compatibility Testing

- Run full test suite after each route migration
- Verify API contracts remain identical
- Test authentication flows thoroughly

### Rollback Strategy

- Keep Pages Router routes until App Router equivalents are fully tested
- Use feature flags if needed for gradual rollout
- Maintain duplicate routes during transition period

### Performance Verification

- Monitor response times during migration
- Verify memory usage patterns
- Test under load to ensure no regressions
