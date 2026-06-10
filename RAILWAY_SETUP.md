# Railway Deployment Setup

## Critical: Set the Root Directory in Railway UI

Railway deploys each service from a specific folder in your repo.
You MUST set this in the Railway dashboard or the build will fail.

---

## Backend Service Setup

In Railway dashboard → your backend service → **Settings** tab:

| Setting | Value |
|---------|-------|
| **Root Directory** | `backend` |
| **Build Command** | `npm install && npx nest build` |
| **Start Command** | `node dist/main` |
| **Watch Paths** | `backend/**` |

---

## Frontend Service Setup

In Railway dashboard → your frontend service → **Settings** tab:

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npx serve dist -s -p $PORT` |
| **Watch Paths** | `frontend/**` |

---

## Why this matters

Your repo has this structure:
```
filedrop/          ← GitHub repo root (Railway sees this first)
  backend/         ← NestJS app lives here
    package.json   ← has @nestjs/cli, nest build command
    nixpacks.toml  ← Railway build instructions for backend
  frontend/        ← React app lives here
    package.json   ← has vite, npm run build
    nixpacks.toml  ← Railway build instructions for frontend
```

If Railway uses the repo root instead of `backend/`, it cannot find
the `nest` command because `@nestjs/cli` is only in `backend/node_modules`.

Setting **Root Directory = backend** in Railway UI fixes this completely.

---

## Step-by-step Railway deploy

### 1. Push to GitHub
```bash
cd filedrop
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR-USERNAME/filedrop.git
git push -u origin main
```

### 2. Create Railway project
- Go to railway.app → New Project → Deploy from GitHub repo
- Select your `filedrop` repo
- **Do NOT deploy yet**

### 3. Configure the backend service
- Click on the auto-created service → **Settings**
- Set **Root Directory** → `backend`
- Set **Build Command** → `npm install && npx nest build`
- Set **Start Command** → `node dist/main`
- Go to **Variables** tab → add all env vars from `.env.prod.example`

### 4. Add MySQL database
- Click **+ New** → **Database** → **MySQL**
- Copy the connection variables from MySQL service → Variables tab
- Add them to your backend service variables:
  ```
  DB_HOST     = (from Railway MySQL MYSQLHOST)
  DB_PORT     = (from Railway MySQL MYSQLPORT)
  DB_USERNAME = (from Railway MySQL MYSQLUSER)
  DB_PASSWORD = (from Railway MySQL MYSQLPASSWORD)
  DB_DATABASE = (from Railway MySQL MYSQLDATABASE)
  ```

### 5. Add MinIO storage
- Click **+ New** → **Template** → search "MinIO Single Service"
- Deploy it, set:
  ```
  MINIO_ROOT_USER     = cfup_minio
  MINIO_ROOT_PASSWORD = your_strong_password
  ```
- Go to **Settings** → **Generate Domain** → copy the URL
- Add to backend variables:
  ```
  MINIO_ENDPOINT = https://minio-xxxx.up.railway.app
  ```

### 6. Add frontend service  
- Click **+ New** → **GitHub Repo** → same repo
- Settings → **Root Directory** → `frontend`
- Settings → **Build Command** → `npm install && npm run build`
- Settings → **Start Command** → `npx serve dist -s -p $PORT`
- Variables → add:
  ```
  VITE_API_URL = https://your-backend-xxxx.up.railway.app/api/v1
  ```

### 7. Deploy
Click **Deploy** on the backend service. Build should complete in ~2 minutes.

---

## All required backend environment variables

```
NODE_ENV=production
PORT=3000
SHOPIFY_API_KEY=your_key_from_partners_dashboard
SHOPIFY_API_SECRET=your_secret_from_partners_dashboard
SHOPIFY_SCOPES=read_products,read_orders,write_orders,read_customers,write_metafields,read_metafields
APP_URL=https://your-backend-xxxx.up.railway.app
JWT_SECRET=run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
DB_HOST=from_railway_mysql
DB_PORT=from_railway_mysql
DB_USERNAME=from_railway_mysql
DB_PASSWORD=from_railway_mysql
DB_DATABASE=from_railway_mysql
STORAGE_PROVIDER=minio
MINIO_ENDPOINT=https://your-minio-xxxx.up.railway.app
MINIO_ROOT_USER=cfup_minio
MINIO_ROOT_PASSWORD=your_password
MINIO_BUCKET=cfup-uploads
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=https://your-frontend-xxxx.up.railway.app
```
