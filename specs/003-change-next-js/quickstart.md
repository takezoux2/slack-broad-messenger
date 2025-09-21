# Quickstart: Next.js Pages Router to App Router Migration

## Prerequisites

- Next.js 15+ project with existing Pages Router API routes
- TypeScript configuration
- Existing test suite with contract tests
- Development environment with Node.js

## Quick Migration Verification

### 1. Verify Current State

```bash
# Ensure all tests pass before migration
npm run test

# Check existing API routes
ls -la src/pages/api/
```

### 2. Create App Router Structure

```bash
# Create the new App Router API directory
mkdir -p src/app/api

# Verify directory structure
ls -la src/app/
```

### 3. Test Single Route Migration

Choose a simple GET endpoint for initial test:

**Before (Pages Router)**: `src/pages/api/channels.ts`

```typescript
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Implementation
    res.status(200).json(data);
  }
}
```

**After (App Router)**: `src/app/api/channels/route.ts`

```typescript
export async function GET(request: Request) {
  // Implementation
  return NextResponse.json(data);
}
```

### 4. Validate Migration

```bash
# Run contract tests for the migrated route
npm run test -- --testPathPattern=channels

# Start development server
npm run dev

# Test the endpoint manually
curl http://localhost:3000/api/channels
```

### 5. Verify Identical Behavior

- [ ] Same response data structure
- [ ] Same HTTP status codes
- [ ] Same error handling
- [ ] Same authentication behavior
- [ ] Same response headers

## Full Migration Process

### Phase 1: Simple GET Routes

1. `/api/channels` ✓ (test migration)
2. `/api/slack-users`
3. `/api/channel-lists`
4. `/api/messages`

### Phase 2: Routes with Parameters

1. `/api/channel-lists/[listId]`
2. `/api/messages/[messageId]`
3. `/api/messages/[messageId]/deliveries`

### Phase 3: POST/PUT/DELETE Routes

1. `/api/channel-lists` (POST)
2. `/api/messages` (POST)
3. `/api/channel-lists/[listId]` (PUT/DELETE)

### Phase 4: Authentication Routes

1. `/api/auth/profile`
2. `/api/auth/signout`
3. `/api/auth/google/signin`
4. `/api/auth/google/callback`
5. `/api/auth/slack`
6. `/api/auth/slack/callback`

### Phase 5: Legacy Routes

1. `/api/send-message`

## Testing Strategy

### For Each Route Migration:

```bash
# 1. Run contract tests before migration
npm run test -- --testPathPattern=<route-name>

# 2. Migrate the route handler

# 3. Run tests again to verify
npm run test -- --testPathPattern=<route-name>

# 4. Run full test suite
npm run test

# 5. Manual verification
curl -X GET/POST http://localhost:3000/api/<route>
```

### Integration Testing:

```bash
# Run all contract tests
npm run test:contract

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

## Rollback Plan

If issues arise during migration:

1. **Keep Pages Router**: Don't delete old routes until new ones are verified
2. **Selective rollback**: Next.js can run both routing systems simultaneously
3. **Quick revert**:
   ```bash
   git checkout HEAD~1 -- src/app/api/<problematic-route>
   ```

## Success Criteria

Migration is complete when:

- [ ] All API routes moved to `/src/app/api/`
- [ ] All contract tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Manual testing confirms identical behavior
- [ ] Performance metrics show no regression
- [ ] Old `/src/pages/api/` directory can be safely removed

## Common Issues & Solutions

### Authentication Middleware

- **Issue**: Middleware behaves differently in App Router
- **Solution**: Use `middleware.ts` file with proper matcher configuration

### Request Body Parsing

- **Issue**: `req.body` not available
- **Solution**: Use `await request.json()` for JSON bodies

### Query Parameters

- **Issue**: `req.query` not available
- **Solution**: Use `request.nextUrl.searchParams` or route params

### Response Headers

- **Issue**: Different header setting methods
- **Solution**: Use `NextResponse` constructor with headers option

## Performance Monitoring

Monitor these metrics during migration:

- API response times
- Memory usage
- Error rates
- Authentication success rates

Use existing monitoring tools and compare before/after metrics to ensure no regression.
