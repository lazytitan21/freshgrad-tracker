# Deploy to Render.com (FREE)

## ✅ Your app is ready! Follow these steps:

### Option 1: Deploy from GitHub (Recommended)

1. **Push code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Ready for Render deployment"
   git remote add origin https://github.com/YOUR_USERNAME/freshgrad-tracker.git
   git push -u origin main
   ```

2. **Go to Render.com**:
   - Visit: https://render.com
   - Sign up/Login (can use GitHub account)

3. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Click "Connect GitHub" and authorize Render
   - Select your repository
   - Click "Connect"

4. **Configure** (auto-detected from render.yaml):
   - **Name**: freshgrad-tracker (or your choice)
   - **Region**: Choose closest (Oregon, Frankfurt, Singapore)
   - **Branch**: main
   - **Build Command**: `npm install` (auto-filled)
   - **Start Command**: `node server.cjs` (auto-filled)
   - **Instance Type**: Free

5. **Click "Create Web Service"**

6. **Wait 2-3 minutes** for deployment

7. **Your app will be live at**: `https://freshgrad-tracker.onrender.com`

---

### Option 2: Deploy without GitHub (Manual Upload)

If you don't want to use GitHub:

1. **Zip your project**:
   - Include: `server.cjs`, `package.json`, `render.yaml`, `dist/`, `server/`, `public/`
   - Exclude: `node_modules/`, `azure-*.zip`, `.git/`

2. **Go to Render Dashboard**: https://dashboard.render.com

3. **Use Render CLI or manual deployment** (check Render docs)

---

## 🎯 Testing After Deployment

1. **Open your Render URL**: `https://YOUR-APP-NAME.onrender.com`

2. **Login with**:
   - Email: `firas.kiftaro@moe.gov.ae`
   - Password: `1234`

3. **Should work immediately!** No waiting, no errors!

---

## 📋 Files Ready for Render:

- ✅ `server.cjs` - Main server file
- ✅ `package.json` - Dependencies (express, cors)
- ✅ `render.yaml` - Render configuration
- ✅ `dist/` - Frontend build
- ✅ `server/data/` - Data storage folder

---

## 🔧 Important Notes:

- **Free tier spins down after 15min inactivity** (30sec cold start on next visit)
- **Data persists** during the session but resets on restart (use database for production)
- **SSL/HTTPS** included automatically
- **Auto-deploys** on every git push

---

## 🚀 Why Render Works (vs Azure Free):

| Feature | Render Free | Azure Free |
|---------|------------|------------|
| Node.js Support | ✅ Native | ❌ Needs IISNode |
| Deployment | ✅ Easy | ❌ Complex |
| SSH Access | ✅ Works | ❌ Broken |
| Cold Start | 30 seconds | N/A (crashes) |
| Setup Time | 3 minutes | Hours of debugging |

---

## Need Help?

If deployment fails, check Render logs in dashboard and share the error!
