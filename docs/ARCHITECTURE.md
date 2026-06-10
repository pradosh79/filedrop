# Architecture Overview — Custom File Upload Pro

## System Design

```
┌──────────────────────────────────────────────────────────────┐
│                        Shopify Storefront                     │
│                   (theme-extension/upload-widget.liquid)      │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS / XHR uploads
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                      AWS CloudFront CDN                       │
│               (edge caching, DDoS protection)                 │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                  AWS Application Load Balancer                │
│                 (SSL termination, health checks)              │
└──────────┬────────────────────────────┬────────────────────-─┘
           │                            │
           ▼                            ▼
┌──────────────────┐         ┌──────────────────────┐
│   ECS Fargate    │         │    ECS Fargate        │
│   Frontend       │         │    Backend (NestJS)   │
│   (React/Polaris)│         │    Port 3000          │
│   Nginx on :80   │         │    2+ instances       │
└──────────────────┘         └──────────┬────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
         ┌──────────────────┐  ┌──────────────┐  ┌─────────────────┐
         │  AWS RDS MySQL   │  │  AWS S3      │  │  ElastiCache    │
         │  8.0 Multi-AZ   │  │  (files)     │  │  Redis          │
         │  (primary data)  │  │              │  │  (rate limits)  │
         └──────────────────┘  └──────────────┘  └─────────────────┘
                    │
                    ▼
         ┌──────────────────┐
         │  ECS Fargate     │
         │  ClamAV Sidecar  │
         │  (virus scan)    │
         └──────────────────┘
```

---

## Backend Module Architecture

```
AppModule
├── AuthModule          — OAuth + JWT
│   ├── AuthController  — /auth/install, /auth/callback, /auth/verify
│   ├── AuthService     — token exchange, merchant CRUD
│   └── JwtStrategy     — passport JWT
│
├── UploadsModule       — File upload pipeline
│   ├── UploadsController — POST /uploads, GET /uploads, DELETE
│   └── UploadsService    — validate → S3 upload → DB record → async scan
│
├── StorageModule       — AWS S3 abstraction
│   └── StorageService  — upload, signed URL, delete, metadata
│
├── SecurityModule      — Input validation + virus scanning
│   └── SecurityService — MIME check, extension blocklist, ClamAV, sanitize
│
├── BillingModule       — Shopify Billing API
│   ├── BillingController — /billing/plans, /subscribe, /activate, /cancel
│   └── BillingService    — Shopify GraphQL appSubscriptionCreate
│
├── PlansModule         — Plan definitions + seeder
│   └── PlansSeeder     — OnApplicationBootstrap seed
│
├── DashboardModule     — Analytics queries
│   ├── DashboardController — /dashboard/stats, /daily-uploads, etc.
│   └── DashboardService    — aggregation queries
│
├── OrdersModule        — Order ↔ upload linkage
│   ├── OrdersController — /orders, /orders/:id/uploads, /download-all
│   └── OrdersService    — getMerchantOrders, getOrderUploads, downloadAll
│
├── WebhooksModule      — Shopify webhook handlers
│   ├── WebhooksController — HMAC-validated Shopify endpoints
│   └── WebhooksService    — handleOrderCreate (cart→order linking)
│
├── SettingsModule      — Merchant configuration
│   ├── SettingsController — /settings (get/patch), /settings/public/:id
│   └── SettingsService    — upsert settings with defaults
│
├── HealthModule        — AWS health checks
│   └── HealthController  — /health (DB + memory + disk), /health/liveness
│
└── TasksModule         — Cron jobs
    └── ScheduledTasksService — Monthly counter reset, orphan cleanup
```

---

## Upload Pipeline (Critical Path)

```
Client request (multipart/form-data)
        │
        ▼
ThrottlerGuard (20 req/min per IP)
        │
        ▼
JwtAuthGuard (validate JWT, load merchant)
        │
        ▼
PlanLimitGuard (check monthly uploads & storage vs plan)
        │
        ▼
MulterModule (buffer file in memory, max 2GB)
        │
        ▼
UploadsService.uploadFile()
  ├── SecurityService.validateMimeType()   — magic bytes via file-type
  ├── SecurityService.validateExtension()  — blocklist check
  ├── SecurityService.validateFileSize()   — vs plan & field limits
  ├── SecurityService.sanitizeFileName()   — path traversal prevention
  ├── validateImageDimensions() [images]   — sharp metadata
  ├── StorageService.uploadFile()          — S3 PutObject (AES-256, private)
  ├── uploadRepository.save()              — DB record, status=pending
  ├── merchantRepository.increment()      — storageUsedBytes, totalUploads
  └── scheduleVirusScan() [async]
        ├── update status → scanning
        ├── SecurityService.scanForViruses()  — ClamAV stream scan
        └── update status → clean | infected
```

---

## Cart → Order Linking

Shopify doesn't provide order info at upload time. The flow:

1. **Upload** — customer uploads file during product page/cart. Upload record stores `cart_token` from Shopify's cart.
2. **Order Webhook** (`orders/create`) — Shopify fires when order is placed.
3. **WebhooksService** — matches uploads by `cart_token` → sets `order_id` + `shopify_order_id`.
4. **Order Note** — calls Shopify Admin API to append upload IDs to the order note for merchant visibility.

---

## Data Flow: Merchant Admin Downloads File

```
Merchant clicks Download in React admin
        │
        ▼
GET /uploads/:id/url (JWT-guarded)
        │
        ▼
UploadsService.getSignedUrl()
  ├── Verify upload belongs to merchant
  └── StorageService.getSignedDownloadUrl()
        └── S3 GetObject presigned URL (1hr expiry)
                │
                ▼
        Redirect response → browser downloads directly from S3
        (backend never proxies file bytes)
```

---

## Tenant Isolation

Every database query is scoped to `merchantId`:

```typescript
// All repository calls include merchantId
const upload = await this.uploadRepository.findOne({
  where: { id, merchantId },  // ← always scoped
});
```

The `merchantId` comes from the JWT payload, never from user input:

```typescript
// JWT payload set at login
const payload = { sub: merchant.id, shopDomain: merchant.shopDomain };
```

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend framework | NestJS | DI, modular, TypeScript-first, decorator-based guards |
| ORM | TypeORM | MySQL support, migrations, active record pattern |
| File storage | AWS S3 | Scalable, cheap, presigned URLs, server-side encryption |
| Virus scanning | ClamAV | Open source, stream-based, Docker-deployable |
| Auth | Shopify OAuth + JWT | Required for embedded apps; JWT avoids session storage |
| Frontend | React + Polaris | Shopify's own design system, looks native in admin |
| State management | React Query | Server state, caching, background refetch |
| DB | MySQL 8.0 | JSON columns, window functions, Shopify ecosystem norm |
| Deploy | ECS Fargate | Serverless containers, no EC2 management |
