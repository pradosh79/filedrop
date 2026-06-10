# Deployment Guide

## Stack

| Component | Software | Port |
|-----------|----------|------|
| App server | Node.js 20 + NestJS | 3000 (internal) |
| Process manager | PM2 | — |
| Web server / HTTPS | Caddy | 80, 443 |
| Database | MySQL 8 | 3306 (localhost only) |
| File storage | MinIO (S3-compatible) | 9000 (internal), 9001 (console) |
| Virus scanner | ClamAV | 3310 (localhost only) |

## Minimum VPS spec

- 2 vCPU
- 4 GB RAM
- 40 GB SSD
- Ubuntu 22.04 or 24.04

Recommended providers: Hetzner CX22 ($5/mo), DigitalOcean Basic ($12/mo), Vultr Cloud Compute ($12/mo).

## One-command deploy

```bash
cd /opt/cfup
sudo bash deploy/deploy.sh
```

See `DEPLOY.md` for the full walkthrough.

## Architecture on VPS

```
Internet
   │
   ▼
Caddy :443 (TLS termination, static files, proxy)
   │
   ├── /api/*  ──► Node.js :3000 (NestJS backend, PM2 cluster)
   │                    │
   │               ┌────┴────────────────────┐
   │               │                         │
   │           MySQL :3306             MinIO :9000
   │           (database)          (file storage)
   │
   └── /*  ──► frontend/dist (static React build)

ClamAV :3310  ← backend calls for virus scanning (localhost only)
```

## PM2 configuration

The app runs as 2 clustered Node.js processes. PM2 handles:
- Zero-downtime reloads (`pm2 reload cfup-backend`)
- Auto-restart on crash
- Log management (`pm2 logs cfup-backend`)
- Auto-start on server reboot

## SSL certificates

Caddy automatically obtains and renews Let's Encrypt certificates. No manual configuration required. Just point your domain's DNS A record to the server IP before running the deploy script.

## File storage

MinIO is a self-hosted, S3-compatible object store. The backend uses the same MinIO SDK as it would for AWS S3 — only the endpoint and credentials differ. Files are stored at `/var/lib/minio/data` on the VPS.

To browse files: open `http://YOUR-SERVER-IP:9001` in a browser (MinIO console).

## Backups

```bash
# Database backup
mysqldump -u cfup_user -p cfup_db > backup_$(date +%Y%m%d).sql

# File storage backup
tar -czf minio_backup_$(date +%Y%m%d).tar.gz /var/lib/minio/data

# Restore database
mysql -u cfup_user -p cfup_db < backup_20260101.sql
```

## Environment variables

See `backend/.env.prod.example` for the full list. Key variables:

```
APP_DOMAIN          your domain (e.g. yourapp.com)
SHOPIFY_API_KEY     from Shopify Partners dashboard
SHOPIFY_API_SECRET  from Shopify Partners dashboard
JWT_SECRET          random 64-char hex string
DB_PASSWORD         MySQL password
MINIO_ROOT_USER     MinIO username
MINIO_ROOT_PASSWORD MinIO password
SMTP_HOST           SMTP server for email notifications
```
