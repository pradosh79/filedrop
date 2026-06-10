# Database Entity Relationship Diagram

```mermaid
erDiagram
    merchants {
        uuid id PK
        varchar shop_domain UK
        varchar access_token
        varchar shop_name
        varchar shop_email
        varchar shop_currency
        varchar shop_timezone
        varchar language
        bigint storage_used_bytes
        int total_uploads
        int monthly_uploads
        tinyint is_active
        datetime uninstalled_at
        datetime installed_at
        datetime created_at
        datetime updated_at
    }

    plans {
        uuid id PK
        enum name UK "free|starter|pro"
        varchar display_name
        decimal monthly_price
        int uploads_per_month
        bigint storage_bytes
        bigint max_file_size_bytes
        json features
        tinyint is_active
        int sort_order
        datetime created_at
        datetime updated_at
    }

    subscriptions {
        uuid id PK
        uuid merchant_id FK
        uuid plan_id FK
        enum status "active|pending|cancelled|expired|trial"
        varchar shopify_charge_id
        varchar shopify_charge_status
        datetime trial_starts_at
        datetime trial_ends_at
        datetime current_period_start
        datetime current_period_end
        tinyint cancel_at_period_end
        datetime cancelled_at
        datetime created_at
        datetime updated_at
    }

    upload_fields {
        uuid id PK
        uuid merchant_id FK
        enum field_type "image|pdf|video|zip|document|custom"
        enum assignment_type "product|variant|collection|tag|store"
        json assignment_ids
        varchar label
        text description
        varchar placeholder
        varchar help_text
        tinyint is_required
        varchar button_text
        decimal max_file_size_mb
        decimal min_file_size_mb
        int max_files
        json allowed_extensions
        int min_width
        int max_width
        int min_height
        int max_height
        varchar required_aspect_ratio
        int min_resolution_dpi
        tinyint enable_cropping
        tinyint enable_rotation
        json conditional_rules
        tinyint is_active
        int sort_order
        datetime created_at
        datetime updated_at
    }

    upload_rules {
        uuid id PK
        uuid upload_field_id FK
        enum rule_type "product_tag|collection_id|variant_option"
        varchar rule_value
        tinyint is_required
        datetime created_at
    }

    uploads {
        uuid id PK
        uuid merchant_id FK
        uuid upload_field_id FK
        varchar original_file_name
        varchar sanitized_file_name
        varchar s3_key
        varchar s3_bucket
        varchar mime_type
        varchar file_extension
        bigint file_size_bytes
        int image_width
        int image_height
        enum status "pending|scanning|clean|infected|failed"
        varchar scan_result
        varchar cart_token
        varchar order_id
        varchar shopify_order_id
        varchar line_item_id
        varchar product_id
        varchar variant_id
        varchar customer_email
        varchar customer_id
        int download_count
        datetime deleted_at
        datetime scanned_at
        datetime created_at
        datetime updated_at
    }

    merchant_settings {
        uuid id PK
        uuid merchant_id UK FK
        varchar button_color
        varchar button_text
        int button_border_radius
        varchar language
        json custom_messages
        tinyint notify_merchant_on_upload
        varchar notification_email
        tinyint notify_customer_on_upload
        int signed_url_expiry_seconds
        datetime created_at
        datetime updated_at
    }

    products {
        uuid id PK
        uuid merchant_id FK
        varchar shopify_product_id
        varchar title
        varchar handle
        varchar product_type
        json tags
        json variants
        json collections
        varchar image_url
        tinyint is_active
        datetime created_at
        datetime updated_at
    }

    notifications {
        uuid id PK
        uuid merchant_id FK
        enum type "upload|security|billing|system"
        varchar title
        text message
        json metadata
        enum status "unread|read"
        datetime read_at
        datetime created_at
    }

    merchants ||--o{ subscriptions : "has"
    merchants ||--o{ upload_fields : "owns"
    merchants ||--o{ uploads : "receives"
    merchants ||--|| merchant_settings : "configures"
    merchants ||--o{ products : "syncs"
    merchants ||--o{ notifications : "receives"
    plans ||--o{ subscriptions : "applied to"
    upload_fields ||--o{ uploads : "receives"
    upload_fields ||--o{ upload_rules : "has"
```
