# Testing Strategy

## Overview

| Layer | Tool | Coverage Target |
|-------|------|----------------|
| Unit Tests | Jest + ts-jest | ≥80% |
| Integration Tests | Jest + Supertest | All API endpoints |
| E2E Tests | Playwright | Critical user flows |
| Load Tests | k6 | Upload endpoint |
| Security Scans | Trivy, npm audit | Every CI run |

---

## Unit Tests (Backend)

Location: `backend/test/*.spec.ts`

### AuthService
- `generateAuthUrl` — correct OAuth URL structure
- `validateHmac` — valid and invalid HMAC
- `validateWebhookHmac` — webhook signature check
- `findById` — found and not found
- `uninstallMerchant` — sets is_active = false

### UploadsService
- `uploadFile` — rejects invalid MIME, invalid size, dimension violations
- `uploadFile` — accepts valid file, creates DB record
- `createField` — saves field with correct defaults
- `deleteUpload` — soft deletes, updates storage stats
- `getFieldsForProduct` — filters by assignment type

### SecurityService
- `validateExtension` — blocklist check
- `validateFileSize` — min/max enforcement
- `sanitizeFileName` — path traversal, special chars, length

### StorageService
- `buildS3Key` — correct folder structure
- `uploadFile` — calls S3 PutObject
- `getSignedDownloadUrl` — presigned URL generation
- `deleteFile` — calls S3 DeleteObject

### BillingService
- `createSubscription` — generates Shopify redirect URL
- `activateSubscription` — updates subscription status
- `getCurrentPlan` — returns active plan with limits

### PlanLimitGuard
- Blocks when monthly upload count exceeded
- Blocks when storage limit exceeded
- Allows when unlimited plan
- Allows when within limits

---

## Integration Tests (API)

Run with: `npm run test:e2e`

### Auth Flow
```
GET /auth/install?shop=test.myshopify.com → 302 to Shopify
GET /auth/install (no shop) → 400
GET /auth/verify (no token) → 401
GET /auth/verify (invalid token) → 401
```

### Upload Fields
```
POST /upload-fields (valid) → 201 with field
POST /upload-fields (invalid type) → 400
GET  /upload-fields → 200 paginated list
PATCH /upload-fields/:id → 200 updated
DELETE /upload-fields/:id → 204
```

### File Upload
```
POST /uploads (clean jpeg) → 201
POST /uploads (blocked extension .exe) → 400
POST /uploads (file too large) → 400
POST /uploads (no auth) → 401
POST /uploads (plan limit reached) → 403
```

### Orders
```
GET /orders → 200 paginated
GET /orders/:id/uploads → 200 with files + signed URLs
GET /orders/nonexistent/uploads → 404
```

---

## E2E Tests (Playwright)

Location: `e2e/`

### Merchant Install Flow
1. Navigate to install URL
2. Shopify OAuth mock redirects back with valid HMAC
3. JWT stored in localStorage
4. Redirect to dashboard

### Upload Field Creation
1. Login as merchant
2. Click "Create Upload Field"
3. Fill form (label, type, max size)
4. Assign to "Entire Store"
5. Save → field appears in list

### Customer Upload Flow (Storefront)
1. Navigate to test product page
2. Upload widget renders
3. Drag & drop a 1MB JPEG
4. Progress bar shows
5. Upload completes → file preview shown
6. Proceed to cart → file ID in cart attributes

### Order Download Flow
1. Webhook triggers order creation
2. Navigate to Orders in admin
3. Order shows file count badge
4. Click order → download modal opens
5. Download link works (signed URL)

---

## Load Testing (k6)

```javascript
// k6/upload-load.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // ramp up
    { duration: '3m', target: 50 },   // sustained load
    { duration: '1m', target: 100 },  // stress test
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95th percentile under 2s
    http_req_failed: ['rate<0.01'],     // <1% errors
  },
};
```

Run: `k6 run k6/upload-load.js --env API_URL=https://api.yourapp.com`

---

## Running Tests

```bash
# Unit tests
cd backend && npm test

# Unit tests with coverage
cd backend && npm run test:cov

# E2E tests
cd backend && npm run test:e2e

# Watch mode
cd backend && npm run test:watch

# Frontend tests
cd frontend && npm test

# Playwright E2E
cd e2e && npx playwright test

# Load test
k6 run k6/upload-load.js
```

---

## CI Integration

All tests run on every PR:
1. `npm audit` — dependency vulnerabilities
2. `npm run test:cov` — unit tests with coverage gate
3. `npm run build` — TypeScript compilation check
4. Trivy scan — container image vulnerabilities
5. Playwright E2E — against staging environment

Coverage report uploaded to Codecov. PRs blocked if coverage drops below 80%.
