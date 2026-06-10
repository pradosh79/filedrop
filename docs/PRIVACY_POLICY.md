# Privacy Policy

**Last updated:** January 1, 2024

Custom File Upload Pro ("we", "our", "the App") is operated by [Your Company Name] ("Company").

---

## What Data We Collect

When you install Custom File Upload Pro, we collect:

- **Shop information:** shop domain, shop name, email address, timezone, and currency from the Shopify API
- **Access tokens:** Shopify OAuth access tokens required to operate the app
- **Uploaded files:** files that your customers upload through the widget on your storefront
- **Upload metadata:** file names, sizes, MIME types, image dimensions, associated order and cart IDs, customer email addresses

---

## How We Use Data

- To provide the file upload service to your store
- To link uploaded files to their associated orders
- To display analytics in your merchant dashboard
- To notify you when customers upload files (if enabled)
- To scan files for viruses before making them accessible

---

## Data Storage

- **Files** are stored on AWS S3, encrypted at rest (AES-256) in the United States
- **Database records** are stored on AWS RDS MySQL in the United States
- Files are accessible only via time-limited signed URLs; they are never publicly accessible
- All data in transit is protected by TLS 1.2 or higher

---

## Data Sharing

We do not sell, rent, or share your data or your customers' data with any third parties, except:

- **AWS** — for file storage and database hosting (bound by AWS's data processing agreement)
- **Shopify** — the platform through which the app operates

---

## Data Retention

- Uploaded files and their records are retained as long as your store has the app installed
- Upon uninstalling the app, all your data is deleted within **30 days**
- You may delete individual files at any time through the merchant dashboard

---

## GDPR Compliance

We support Shopify's mandatory GDPR webhooks:

- **`customers/data_request`** — We will provide a copy of customer data within 30 days
- **`customers/redact`** — We will delete customer data within 30 days
- **`shop/redact`** — All shop data is deleted within 30 days of uninstall

To submit a data request or deletion request, contact us at: privacy@yourapp.com

---

## Your Rights

Depending on your location, you may have the right to:
- Access data we hold about you
- Request deletion of your data
- Object to processing of your data
- Data portability

Contact us at privacy@yourapp.com for any privacy-related requests.

---

## Security

- All uploaded files are automatically scanned for viruses using ClamAV
- Infected files are quarantined and never served to merchants or customers
- Access to files requires authentication (JWT) or time-limited signed URLs
- Our infrastructure is deployed in AWS with private networking and encrypted storage

---

## Changes to This Policy

We may update this policy from time to time. We will notify merchants via the Shopify admin when material changes are made.

---

## Contact

For privacy questions: privacy@yourapp.com  
For support: support@yourapp.com
