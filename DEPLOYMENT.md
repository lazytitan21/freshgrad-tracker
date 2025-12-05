# FreshGrad Tracker - Azure Web Apps Deployment Guide

## 🎯 Overview

This guide explains how to deploy the FreshGrad Tracker React SPA to Azure Web Apps. The application has been configured with all necessary files for Azure deployment.

---

## 📋 Prerequisites

- **Azure Subscription** with an active Web App resource
- **Node.js 18+** installed locally
- **npm** or **yarn** package manager
- **Git** (optional, for Git-based deployment)

---

## 🏗️ Deployment Architecture

The application uses:
- **Frontend:** Vite + React SPA (Static files in `dist/`)
- **Backend (Optional):** Express.js API server for hero images
- **Web Server:** IIS on Azure Web Apps (Windows)
- **Routing:** `web.config` handles SPA client-side routing

---

## 🚀 Deployment Methods

### **Method 1: Static Site (Recommended for Pure SPA)**

This method deploys only the built React app without the backend server.

#### **Step 1: Build the Application**

```powershell
# Install dependencies
npm install

# Build the application
npm run build

# The build output will be in the 'dist/' folder
```

#### **Step 2: Verify Build**

```powershell
# Test the build locally
npm run deploy:local
# Open http://localhost:3000 in your browser
```

#### **Step 3: Deploy to Azure via Kudu**

1. **Open Kudu Console:**
   - Navigate to: `https://<your-app-name>.scm.azurewebsites.net`
   - Or from Azure Portal: Your Web App → Advanced Tools → Go

2. **Upload Files:**
   - In Kudu, go to: **Debug Console** → **CMD** or **PowerShell**
   - Navigate to: `site/wwwroot`
   - **Delete all existing files** in `wwwroot` (important!)
   - Upload the entire contents of your `dist/` folder:
     - `index.html`
     - `web.config`
     - `assets/` folder
     - `Heros/` folder (if exists)
     - Any other static files

3. **Verify Deployment:**
   - Visit: `https://<your-app-name>.azurewebsites.net`
   - The application should load correctly

#### **Step 4: Configure Azure Web App Settings**

In the Azure Portal:

1. Go to: **Your Web App** → **Configuration** → **General settings**
2. Set:
   - **Platform:** Windows
   - **Stack:** Not required (static site)
   - **Always On:** On (keeps your app loaded)
3. Click **Save**

---

### **Method 2: With Backend API (Node.js + Express)**

This method deploys both the React frontend and the Express backend.

#### **Step 1: Build the Application**

```powershell
# Install dependencies
npm install

# Build the frontend
npm run build
```

#### **Step 2: Deploy via Kudu**

1. **Open Kudu Console:**
   - Navigate to: `https://<your-app-name>.scm.azurewebsites.net`

2. **Upload Files:**
   - Navigate to: `site/wwwroot`
   - Upload these files/folders:
     - `server.js` (backend server)
     - `package.json` (with express dependencies)
     - `dist/` folder contents (built React app)
     - `web.config`

3. **Install Backend Dependencies:**
   In Kudu CMD/PowerShell:
   ```powershell
   cd D:\home\site\wwwroot
   npm install --production
   ```

#### **Step 3: Configure Startup Command**

In the Azure Portal:

1. Go to: **Your Web App** → **Configuration** → **General settings**
2. Set:
   - **Stack:** Node (select your version, e.g., 18 LTS)
   - **Startup Command:** `node server.js`
3. Click **Save**

4. Go to: **Configuration** → **Application settings**
5. Add:
   - **Name:** `NODE_ENV`
   - **Value:** `production`
6. Click **Save**

#### **Step 4: Restart the App**

```powershell
# Restart the Web App
az webapp restart --name <your-app-name> --resource-group <your-resource-group>
```

---

### **Method 3: Git Deployment (CI/CD)**

For automated deployments using Git.

#### **Step 1: Initialize Git Repository**

```powershell
git init
git add .
git commit -m "Initial commit"
```

#### **Step 2: Configure Azure Git Deployment**

In Azure Portal:

1. Go to: **Your Web App** → **Deployment Center**
2. Select: **Local Git**
3. Click **Save**
4. Copy the **Git Clone URL**

#### **Step 3: Deploy**

```powershell
# Add Azure remote
git remote add azure <git-clone-url>

# Push to Azure
git push azure main
```

Azure will automatically:
- Install dependencies
- Run the build script
- Deploy the application

---

## 🔧 Configuration Files Explained

### **1. `web.config`**
- **Purpose:** Configures IIS to route all requests to `index.html` for SPA routing
- **Location:** Root directory (copied to `dist/` during build)
- **Key Features:**
  - URL rewriting for client-side routes
  - MIME type configuration
  - Security headers

### **2. `vite.config.js`**
- **Base Path:** Set to `./` for relative paths (Azure-compatible)
- **Build Output:** Optimized chunks for better caching
- **Source Maps:** Enabled for debugging

### **3. `server.js`**
- **Purpose:** Optional Express backend for `/api/heros` endpoint
- **Port:** Uses `process.env.PORT` (Azure assigns this)
- **Static Serving:** Serves built React app in production

### **4. `.deployment`**
- **Purpose:** Tells Azure which script to run during deployment
- **Script:** Points to `deploy.sh` or `deploy.ps1`

### **5. `deploy.ps1` / `deploy.sh`**
- **Purpose:** Custom build script for Azure
- **Actions:**
  - Installs dependencies
  - Builds the app
  - Copies `web.config` to `dist/`
  - Copies public assets

---

## 🐛 Troubleshooting

### **Blank Page Issue**

If you see a blank page:

1. **Check Browser Console:**
   - Press F12 → Console tab
   - Look for 404 errors or loading issues

2. **Verify `web.config` is in `dist/`:**
   ```powershell
   ls dist/web.config
   ```

3. **Check File Paths:**
   - Open `dist/index.html`
   - Verify asset paths start with `./` not `/`

4. **Clear Browser Cache:**
   - Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

5. **Check Azure Logs:**
   - In Azure Portal: **Your Web App** → **Log Stream**
   - Look for startup errors

### **API Endpoint Not Working**

If `/api/heros` returns 404:

1. **Verify Backend is Running:**
   - Check if `server.js` is deployed
   - Verify startup command is set to `node server.js`

2. **Check Logs:**
   ```powershell
   # Azure CLI
   az webapp log tail --name <your-app-name> --resource-group <your-resource-group>
   ```

3. **Test Endpoint:**
   - Visit: `https://<your-app-name>.azurewebsites.net/api/heros`
   - Should return JSON array of hero images

### **500 Internal Server Error**

1. **Enable Detailed Errors:**
   - In `web.config`, temporarily set `errorMode="Detailed"`
   - **Warning:** Disable this in production!

2. **Check Node Version:**
   - Azure Portal → Configuration → General settings
   - Ensure Node version matches your local version

3. **Verify Dependencies:**
   ```powershell
   # In Kudu console
   cd D:\home\site\wwwroot
   npm list
   ```

---

## ✅ Deployment Checklist

Before deploying:

- [ ] Run `npm install` to install all dependencies
- [ ] Run `npm run build` to create production build
- [ ] Verify `dist/web.config` exists
- [ ] Test locally with `npm run deploy:local`
- [ ] Commit all changes to Git (if using Git deployment)
- [ ] Backup existing Azure deployment (if any)

During deployment:

- [ ] Delete old files from `wwwroot` in Kudu
- [ ] Upload all files from `dist/` folder
- [ ] Configure Azure Web App settings (Stack, Startup Command)
- [ ] Set environment variables if needed
- [ ] Restart the Web App

After deployment:

- [ ] Test the application URL
- [ ] Check all routes work correctly
- [ ] Verify login functionality
- [ ] Test PDF export feature
- [ ] Check browser console for errors
- [ ] Monitor Azure logs for issues

---

## 📚 Additional Resources

- [Azure Web Apps Documentation](https://learn.microsoft.com/en-us/azure/app-service/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [IIS URL Rewrite Documentation](https://learn.microsoft.com/en-us/iis/extensions/url-rewrite-module/using-the-url-rewrite-module)

---

## 🆘 Need Help?

If you continue to experience issues:

1. **Check Azure Application Insights** for detailed error logs
2. **Enable Remote Debugging** in Azure Portal
3. **Contact Azure Support** for infrastructure issues
4. **Review Kudu logs** at `https://<your-app-name>.scm.azurewebsites.net/api/logs/docker`

---

## 📝 Notes

- **LocalStorage Data:** User data is stored in browser LocalStorage and won't persist across devices
- **Authentication:** Currently demo-only with hardcoded credentials
- **Hero Images:** The `/api/heros` endpoint requires the backend server to be running
- **CORS:** Configured in `server.js` for local development
- **HTTPS:** Azure Web Apps provide free SSL certificates

---

**Last Updated:** November 19, 2025
**Version:** 1.0.0
