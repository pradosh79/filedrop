# Railway Deployment — Step by Step

## Before you start: 3 things you need

1. A GitHub account (github.com — free)
2. A Railway account (railway.app — free, sign up with GitHub)
3. Your Shopify API Key and Secret (from partners.shopify.com → your app → API credentials)

---

## Step 1 — Push this project to GitHub

On your computer, open a terminal (Command Prompt on Windows):

```bash
cd filedrop
git init
git add .
git commit -m "Initial commit"
```

Go to github.com → click the **+** button → **New repository**
- Name it `filedrop`
- Keep it Private
- Click **Create repository**

Then run (replace YOUR-USERNAME with your GitHub username):
```bash
git remote add origin https://github.com/YOUR-USERNAME/filedrop.git
git push -u origin main
```

---

## Step 2 — Create Railway project

1. Go to **railway.app** → click **New Project**
2. Click **Deploy from GitHub repo**
3. Select your `filedrop` repository
4. Railway creates one service automatically — **do not deploy yet**

---

## Step 3 — Add MySQL database

1. In your Railway project, click the **+ New** button
2. Click **Database** → **MySQL**
3. Railway creates a MySQL service
4. Click on the MySQL service → click **Variables** tab
5. You will see variables like `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT`
6. **Keep this tab open** — you need these values in Step 5

---

## Step 4 — Configure the backend service (CRITICAL)

Click on the **filedrop** service (the one from GitHub) → **Settings** tab:

| Setting | Value to enter |
|---------|---------------|
| **Root Directory** | `backend` |
| **Build Command** | `npm install && npx nest build` |
| **Start Command** | `node dist/main` |

Click **Save** after each change.

---

## Step 5 — Add environment variables to backend

Click on the **filedrop** service → **Variables** tab → click **+ New Variable** for each:

### Required — App settings
```
NODE_ENV          = production
PORT              = 3000
```

### Required — Shopify (from partners.shopify.com)
```
SHOPIFY_API_KEY       = paste_your_api_key_here
SHOPIFY_API_SECRET    = paste_your_api_secret_here
SHOPIFY_SCOPES        = read_products,read_orders,write_orders,read_customers,write_metafields,read_metafields
```

### Required — Database (copy from MySQL service Variables tab)
```
DB_HOST     = paste MYSQLHOST value here
DB_PORT     = paste MYSQLPORT value here  (usually 3306)
DB_USER     = paste MYSQLUSER value here
DB_PASSWORD = paste MYSQLPASSWORD value here
DB_NAME     = paste MYSQLDATABASE value here
```

### Required — JWT Secret (generate one)
Open any browser and go to:
`https://www.uuidgenerator.net/` → copy the UUID → paste it twice to make it longer
```
JWT_SECRET = paste-your-long-random-string-here
```

### Required — File storage (MinIO — set up in Step 6)
```
STORAGE_PROVIDER    = minio
MINIO_ENDPOINT      = (fill in after Step 6)
MINIO_ROOT_USER     = cfup_minio
MINIO_ROOT_PASSWORD = choose_a_strong_password
MINIO_BUCKET        = cfup-uploads
```

### Optional — Email (skip for now, add later)
```
SMTP_HOST = smtp.resend.com
SMTP_PORT = 465
SMTP_USER = resend
SMTP_PASS = (get free API key from resend.com)
EMAIL_FROM = noreply@yourdomain.com
```

---

## Step 6 — Add MinIO file storage

1. In Railway project → click **+ New** → **Template**
2. Search for **"MinIO Single Service"** → click Deploy
3. On the MinIO service → **Variables** tab → add:
   ```
   MINIO_ROOT_USER     = cfup_minio
   MINIO_ROOT_PASSWORD = same_password_as_in_step_5
   ```
4. Click on MinIO service → **Settings** → **Networking** → **Generate Domain**
5. Copy the domain (looks like `minio-production-xxxx.up.railway.app`)
6. Go back to your **filedrop backend service** → Variables → update:
   ```
   MINIO_ENDPOINT = https://minio-production-xxxx.up.railway.app
   ```

---

## Step 7 — Deploy

1. Click on the **filedrop** service
2. Click **Deploy** (or it may redeploy automatically after adding variables)
3. Watch the Build Logs — look for:
   ```
   Successfully compiled: XX files with swc
   🚀 Filedrop API running on port 3000
   ```
4. Health check should pass at `/api/v1/health`

---

## Step 8 — Get your app URL

After successful deploy:
1. Click on the filedrop service → **Settings** → **Networking** → **Generate Domain**
2. Copy the URL (e.g. `filedrop-production-xxxx.up.railway.app`)
3. Add it as an environment variable:
   ```
   APP_URL      = https://filedrop-production-xxxx.up.railway.app
   FRONTEND_URL = https://filedrop-production-xxxx.up.railway.app
   ```

---

## Step 9 — Update Shopify Partners dashboard

Go to **partners.shopify.com** → Apps → your app → **App setup**:

- **App URL**: `https://filedrop-production-xxxx.up.railway.app`
- **Allowed redirect URLs**: `https://filedrop-production-xxxx.up.railway.app/auth/callback`

---

## Troubleshooting

### Build fails with "nest: not found"
→ Make sure **Root Directory** is set to `backend` in Railway Settings

### Health check fails "service unavailable"
→ Check the **Deploy Logs** tab (not Build Logs) for the actual startup error
→ Most common cause: DB variables not set correctly — double-check DB_HOST, DB_USER, DB_NAME, DB_PASSWORD

### App crashes immediately
→ Go to service → **Deploy Logs** → look for red error lines
→ Usually a missing required environment variable

### "Cannot connect to database"
→ DB_HOST must be copied from the Railway MySQL service MYSQLHOST variable exactly
→ Do not use "localhost" — Railway MySQL has its own internal hostname

---

## Summary of all environment variables (copy this list)

```
NODE_ENV=production
PORT=3000
SHOPIFY_API_KEY=your_key
SHOPIFY_API_SECRET=your_secret
SHOPIFY_SCOPES=read_products,read_orders,write_orders,read_customers,write_metafields,read_metafields
APP_URL=https://your-app.up.railway.app
JWT_SECRET=your_long_random_string
DB_HOST=from_railway_mysql_MYSQLHOST
DB_PORT=from_railway_mysql_MYSQLPORT
DB_USER=from_railway_mysql_MYSQLUSER
DB_PASSWORD=from_railway_mysql_MYSQLPASSWORD
DB_NAME=from_railway_mysql_MYSQLDATABASE
STORAGE_PROVIDER=minio
MINIO_ENDPOINT=https://your-minio.up.railway.app
MINIO_ROOT_USER=cfup_minio
MINIO_ROOT_PASSWORD=your_minio_password
MINIO_BUCKET=cfup-uploads
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=your_resend_key
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=https://your-app.up.railway.app
```
