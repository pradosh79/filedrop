# Database Documentation

Engine: **MySQL 8.0**
Charset: **utf8mb4_unicode_ci**

---

## Entity Relationship Overview

```
plans ──────────────────── subscriptions ──────── merchants
                                                      │
                                          ┌───────────┤
                                          │           │
                                    upload_fields  merchant_settings
                                          │
                                    upload_rules
                                          │
                                       uploads
```

---

## Tables

### `plans`
Stores the three subscription tiers.

| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) | UUID PK |
| name | ENUM | free / starter / pro |
| display_name | VARCHAR(100) | |
| monthly_price | DECIMAL(10,2) | |
| uploads_per_month | INT | -1 = unlimited |
| storage_bytes | BIGINT UNSIGNED | |
| max_file_size_bytes | BIGINT UNSIGNED | |
| features | JSON | Feature flags |
| is_active | TINYINT(1) | |
| sort_order | INT | Display order |

---

### `merchants`
One row per installed Shopify store.

| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) | UUID PK |
| shop_domain | VARCHAR(255) | UNIQUE |
| access_token | VARCHAR(500) | Encrypted at rest |
| shop_name / email / currency / timezone | VARCHAR | From Shopify API |
| language | VARCHAR(10) | Default: en |
| storage_used_bytes | BIGINT UNSIGNED | Denormalized counter |
| total_uploads | INT UNSIGNED | Denormalized counter |
| monthly_uploads | INT UNSIGNED | Reset monthly via cron |
| is_active | TINYINT(1) | False after uninstall |
| installed_at / uninstalled_at | DATETIME(3) | |

**Indexes:**
- `uq_merchants_shop_domain` — unique
- `idx_merchants_is_active`

---

### `subscriptions`
Shopify recurring charge records.

| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) | UUID PK |
| merchant_id | VARCHAR(36) | FK → merchants.id |
| plan_id | VARCHAR(36) | FK → plans.id |
| status | ENUM | active/pending/cancelled/expired/trial |
| shopify_charge_id | VARCHAR(255) | From Shopify Billing API |
| trial_starts_at / trial_ends_at | DATETIME(3) | 14-day trial |
| current_period_start/end | DATETIME(3) | |
| cancel_at_period_end | TINYINT(1) | |
| cancelled_at | DATETIME(3) | |

**Indexes:**
- `idx_subscriptions_merchant_id`
- `idx_subscriptions_status`
- `idx_subscriptions_shopify_charge_id`

---

### `merchant_settings`
One row per merchant (1:1 with merchants).

| Column | Type | Default |
|--------|------|---------|
| button_color | VARCHAR(20) | #008060 |
| button_text | VARCHAR(100) | Upload File |
| button_border_radius | INT | 4 |
| language | VARCHAR(10) | en |
| custom_messages | JSON | {} |
| notify_merchant_on_upload | TINYINT(1) | 1 |
| notification_email | VARCHAR(255) | NULL |
| notify_customer_on_upload | TINYINT(1) | 0 |
| signed_url_expiry_seconds | INT | 3600 |

---

### `upload_fields`
Configurable upload widgets the merchant creates.

| Column | Type | Notes |
|--------|------|-------|
| field_type | ENUM | image/pdf/video/zip/document/custom |
| assignment_type | ENUM | product/variant/collection/tag/store |
| assignment_ids | JSON | Array of Shopify GIDs |
| label / description / placeholder / help_text | VARCHAR/TEXT | |
| is_required | TINYINT(1) | |
| button_text | VARCHAR(100) | |
| max_file_size_mb / min_file_size_mb | DECIMAL(10,2) | |
| max_files | INT | Max simultaneous uploads |
| allowed_extensions | JSON | ["jpg","png"] |
| min_width / max_width | INT | px (image only) |
| min_height / max_height | INT | px (image only) |
| required_aspect_ratio | VARCHAR(20) | e.g. "16:9" |
| min_resolution_dpi | INT | |
| enable_cropping / enable_rotation | TINYINT(1) | |
| conditional_rules | JSON | Array of rule objects |
| is_active | TINYINT(1) | |
| sort_order | INT | |

**Indexes:**
- `idx_upload_fields_merchant_active (merchant_id, is_active)`
- `idx_upload_fields_assignment`

---

### `upload_rules`
Conditional logic for showing/hiding fields.

| Column | Type | Notes |
|--------|------|-------|
| upload_field_id | VARCHAR(36) | FK → upload_fields.id |
| merchant_id | VARCHAR(36) | FK → merchants.id |
| condition | ENUM | product_tag/variant_title/product_id/collection_id/customer_tag |
| operator | ENUM | equals/not_equals/contains/not_contains |
| value | VARCHAR(500) | The value to compare |
| action | ENUM | show/hide/require |
| sort_order | INT | |

---

### `uploads`
Each uploaded file record.

| Column | Type | Notes |
|--------|------|-------|
| merchant_id | VARCHAR(36) | FK → merchants.id |
| upload_field_id | VARCHAR(36) | FK → upload_fields.id, nullable |
| original_file_name | VARCHAR(500) | Original client filename |
| sanitized_file_name | VARCHAR(500) | After security sanitization |
| s3_key | VARCHAR(1000) | `{merchantId}/order_{id}/uploaded_files/{uuid}.ext` |
| s3_bucket | VARCHAR(255) | |
| mime_type | VARCHAR(255) | |
| file_extension | VARCHAR(50) | |
| file_size_bytes | BIGINT UNSIGNED | |
| image_width / image_height | INT | NULL for non-images |
| status | ENUM | pending/scanning/clean/infected/failed |
| virus_scan_result | VARCHAR(500) | ClamAV output |
| cart_token | VARCHAR(500) | Shopify cart token for pre-order linking |
| order_id / shopify_order_id | VARCHAR(255) | Set after order creation webhook |
| line_item_id / product_id / variant_id | VARCHAR(255) | |
| customer_email / customer_id | VARCHAR(255) | |
| download_count | INT UNSIGNED | |
| deleted_at | DATETIME(3) | Soft delete |

**Indexes:**
- `idx_uploads_merchant_order (merchant_id, order_id)`
- `idx_uploads_merchant_status (merchant_id, status)`
- `idx_uploads_merchant_created (merchant_id, created_at)`
- `idx_uploads_cart_token`
- `idx_uploads_deleted_at`

---

## Monthly Reset Cron

`monthly_uploads` on the `merchants` table is reset to 0 on the 1st of each month:

```sql
UPDATE merchants SET monthly_uploads = 0 WHERE is_active = 1;
```

Schedule: `0 0 1 * *` (midnight UTC, 1st of month)

---

## Storage Accounting

`storage_used_bytes` on `merchants` is maintained via:
- **Increment** on successful upload: `+= file_size_bytes`
- **Decrement** on delete: `-= file_size_bytes`

This avoids expensive `SUM()` queries on the uploads table at read time.
