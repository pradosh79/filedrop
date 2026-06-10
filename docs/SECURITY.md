# Security Documentation

## Security Checklist

### Transport Security
- [x] All traffic over HTTPS/TLS 1.2+
- [x] HSTS header with 1-year max-age
- [x] HTTP to HTTPS redirect at load balancer
- [x] TLS 1.0/1.1 disabled in Nginx config
- [x] Secure cipher suites only

### Authentication & Authorization
- [x] Shopify HMAC validation on every OAuth callback
- [x] CSRF state parameter for OAuth flow
- [x] JWT with HS256, 24h expiry
- [x] JWT validated on all protected routes
- [x] Merchant isolation — all queries scoped by merchantId
- [x] Plan enforcement guard on upload endpoint

### Input Validation
- [x] File MIME validation via magic bytes (file-type library)
- [x] Extension blocklist (exe, php, sh, bat, cmd, ps1, etc.)
- [x] Path traversal prevention in filename sanitization
- [x] Filename length truncation to 255 chars
- [x] Image dimension validation via sharp
- [x] File size enforcement per plan
- [x] Class-validator DTOs on all API inputs
- [x] SQL injection prevention via TypeORM parameterized queries

### Virus Scanning
- [x] ClamAV scanning on every uploaded file
- [x] Async scan with status tracking (pending → scanning → clean/infected)
- [x] Infected files flagged in DB, not served
- [x] ClamAV database auto-updated daily

### Storage Security
- [x] S3 bucket: all public access blocked
- [x] S3 server-side encryption (AES-256)
- [x] Files accessed only via signed URLs (time-limited)
- [x] Signed URL expiry configurable (default 1 hour)
- [x] S3 key structure prevents enumeration
- [x] Versioning enabled for recovery

### Rate Limiting
- [x] Upload endpoint: 20 requests/min per IP
- [x] API endpoints: 100 requests/min per IP
- [x] Nginx zones configured separately for uploads vs API
- [x] 429 responses with Retry-After header

### HTTP Security Headers
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; ...
```

### Webhook Security
- [x] HMAC-SHA256 validation on all Shopify webhooks
- [x] Raw body preserved for HMAC comparison
- [x] 401 returned immediately on invalid HMAC

### Infrastructure
- [x] ECS tasks run as non-root user
- [x] Read-only root filesystem in containers
- [x] Secrets in AWS SSM Parameter Store (SecureString)
- [x] VPC with private subnets for ECS and RDS
- [x] Security groups: minimal ingress rules
- [x] RDS: no public access, deletion protection enabled
- [x] CloudTrail enabled for audit logging
- [x] S3 access logging enabled
- [x] Trivy container scanning in CI/CD pipeline

---

## Threat Model

### T1: Malicious File Upload
**Mitigation:** MIME magic bytes check, extension blocklist, ClamAV scan, files stored in S3 (not served directly), signed URLs only.

### T2: SSRF via Webhook URL
**Mitigation:** Webhooks originate from Shopify only; HMAC validation ensures authenticity.

### T3: SQL Injection
**Mitigation:** TypeORM parameterized queries throughout. No raw SQL with user input.

### T4: Privilege Escalation
**Mitigation:** All database queries include `merchantId = :merchantId` scope. JWT contains merchantId, not user-supplied.

### T5: Billing Bypass
**Mitigation:** Plan limits checked server-side via `PlanLimitGuard` on every upload request, not client-side.

### T6: Directory Traversal
**Mitigation:** `sanitizeFileName()` removes `..`, `/`, `\`, null bytes, and control characters before use in S3 keys.

### T7: Shopify Session Hijacking
**Mitigation:** State parameter in OAuth flow (CSRF token); HMAC validation on callback.

### T8: DDoS on Upload Endpoint
**Mitigation:** Nginx rate limiting (20/min), ALB security groups, WAF rules (recommended for production).

---

## Incident Response

### If a virus is detected:
1. Upload status → `infected` (DB)
2. File remains in S3 with a quarantine prefix (moved by async job)
3. Merchant receives email alert (if notifications enabled)
4. File is never served to anyone

### If a breach is suspected:
1. Rotate JWT_SECRET immediately (invalidates all sessions)
2. Rotate AWS credentials
3. Review CloudTrail logs
4. Revoke compromised Shopify access tokens via Partners dashboard

---

## Dependencies to Keep Updated

| Package | Why Critical |
|---------|-------------|
| `clamscan` | Virus definitions |
| `helmet` | Security headers |
| `file-type` | MIME validation |
| `@nestjs/*` | Framework vulnerabilities |
| `mysql2` | SQL driver |
| `aws-sdk` | Auth/transport |

Run `npm audit` on every deploy. Trivy scans container images in CI.
