# API Documentation — Custom File Upload Pro

Base URL: `https://api.yourapp.com`

All merchant endpoints require `Authorization: Bearer <JWT>` from the OAuth callback.

---

## Authentication

### Install App
```
GET /auth/install?shop={shop_domain}
```
Redirects to Shopify OAuth consent screen.

**Query Params:**
| Param | Required | Description |
|-------|----------|-------------|
| shop  | Yes | e.g. `my-store.myshopify.com` |

---

### OAuth Callback
```
GET /auth/callback?code=&hmac=&shop=&state=&timestamp=
```
Exchanges authorization code for access token, issues JWT.

**Response:**
```json
{ "token": "eyJhbGci...", "shop": "my-store.myshopify.com" }
```

---

### Verify Token
```
GET /auth/verify
Authorization: Bearer <JWT>
```
Returns merchant info if token is valid.

---

## Dashboard

### Get Stats
```
GET /dashboard/stats
```
**Response:**
```json
{
  "totalUploads": 1247,
  "uploadsToday": 23,
  "uploadsThisMonth": 342,
  "ordersWithUploads": 189,
  "activeFields": 5,
  "storageUsedBytes": 4831838208,
  "storageUsedFormatted": "4.5 GB"
}
```

### Get Daily Uploads
```
GET /dashboard/daily-uploads
```
Returns upload counts per day for the last 30 days.

### Get Monthly Uploads
```
GET /dashboard/monthly-uploads
```
Returns upload counts per month for the last 12 months.

### Get Storage Growth
```
GET /dashboard/storage-growth
```
Returns cumulative storage per day for the last 90 days.

---

## Upload Fields

### List Fields
```
GET /upload-fields?page=1&limit=20&search=&active=true
```

### Create Field
```
POST /upload-fields
Content-Type: application/json

{
  "fieldType": "image",
  "assignmentType": "product",
  "assignmentIds": ["gid://shopify/Product/123"],
  "label": "Upload Your Design",
  "description": "PNG, JPG up to 50MB",
  "isRequired": true,
  "buttonText": "Upload Design",
  "maxFileSizeMb": 50,
  "maxFiles": 3,
  "allowedExtensions": ["jpg", "jpeg", "png"],
  "minWidth": 1000,
  "maxWidth": 5000,
  "enableCropping": true
}
```

### Get Field
```
GET /upload-fields/:id
```

### Update Field
```
PATCH /upload-fields/:id
```

### Delete Field
```
DELETE /upload-fields/:id
```

### Get Fields for Product (Storefront)
```
GET /upload-fields/storefront?productId=&variantId=&tags[]=custom&merchantId=
```
Public endpoint used by theme extension. Returns active fields matching the product.

---

## File Uploads

### Upload File
```
POST /uploads
Authorization: Bearer <JWT>  [OR X-Merchant-Id for storefront]
Content-Type: multipart/form-data

file: <binary>
fieldId: <upload-field-id>
cartToken: <shopify-cart-token>
productId: <optional>
variantId: <optional>
customerEmail: <optional>
```

**Response:**
```json
{
  "id": "uuid",
  "originalFileName": "design.png",
  "fileSizeBytes": 2048000,
  "status": "pending",
  "mimeType": "image/png",
  "imageWidth": 2400,
  "imageHeight": 1600,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**
- `400` — Validation failed (size, type, dimensions)
- `403` — Plan limit exceeded
- `415` — Unsupported media type (MIME mismatch)

### List Uploads
```
GET /uploads?page=1&limit=25&status=clean&search=
```

### Get Signed Download URL
```
GET /uploads/:id/url
```
Returns a presigned S3 URL valid for 1 hour.

### Delete Upload
```
DELETE /uploads/:id
```
Soft-deletes the record and removes from S3.

---

## Orders

### Get Order Uploads
```
GET /orders/:orderId/uploads
```
Returns all uploads for an order with signed download URLs.

### List Orders with Uploads
```
GET /orders?page=1&limit=20
```

### Download All Files for Order
```
GET /orders/:orderId/download-all
```
Returns array of signed URLs for bulk download.

---

## Billing

### List Plans
```
GET /billing/plans
```

### Get Current Plan
```
GET /billing/current
```

### Subscribe to Plan
```
POST /billing/subscribe/:planName?returnUrl=
```
Returns Shopify confirmation URL. Redirect the merchant to it.

### Activate Subscription
```
GET /billing/activate?charge_id=
```
Called after merchant approves the charge on Shopify.

### Cancel Subscription
```
POST /billing/cancel
```

### Activate Free Plan
```
POST /billing/free
```

---

## Settings

### Get Settings
```
GET /settings
```

### Update Settings
```
PATCH /settings
Content-Type: application/json

{
  "buttonColor": "#FF6B35",
  "buttonText": "Upload Your File",
  "buttonBorderRadius": 8,
  "language": "es",
  "notifyMerchantOnUpload": true,
  "notificationEmail": "owner@store.com",
  "signedUrlExpirySeconds": 7200
}
```

### Get Public Settings (Storefront)
```
GET /settings/public/:merchantId
```
Used by theme extension. Returns styling config only.

---

## Webhooks

All webhook endpoints validate Shopify HMAC signature.

```
POST /webhooks/app/uninstalled
POST /webhooks/orders/create
POST /webhooks/orders/updated
POST /webhooks/products/update
```

Required headers:
```
X-Shopify-Topic: orders/create
X-Shopify-Shop-Domain: my-store.myshopify.com
X-Shopify-Hmac-Sha256: <base64-hmac>
```

---

## Error Format

All errors follow:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": ["maxFileSizeMb must be a positive number"],
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/upload-fields"
}
```

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `POST /uploads` | 20 per minute per IP |
| All other API | 100 per minute per IP |

Headers returned:
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 18
X-RateLimit-Reset: 1705312260
```
