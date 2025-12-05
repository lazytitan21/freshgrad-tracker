# FreshGrad Training Tracker

A web application to track the journey of students from training through to hiring as teachers. Built for the UAE Ministry of Education (MOE).

## 🎯 Features

- **Student/Candidate Management**: Track candidates through their entire journey from application to hiring
- **Course Catalog**: Manage training courses across multiple tracks (STEM, Languages, ICT)
- **Mentor Management**: Coordinate mentors and their assignments
- **User Management**: Role-based access control (Admin, Auditor, Manager, Trainer)
- **Progress Tracking**: Monitor course enrollments, completions, and assessments
- **Reporting**: Export data to Excel for analysis and reporting
- **Notifications**: In-app notification system for important updates
- **Audit Trail**: Complete audit log of all system actions

## 🏗️ Architecture

### Frontend
- **React 19** with Vite for fast development and optimized builds
- **Tailwind CSS** for styling
- **Framer Motion** for smooth animations
- **Lucide React** for icons
- **XLSX** for Excel import/export

### Backend
- **Node.js** with Express
- **Local JSON file storage** (no database required)
- **RESTful API** architecture
- **CORS** enabled for cross-origin requests

### Storage
- Simple JSON files stored on the server filesystem
- No database setup required
- Perfect for MVP and small-scale deployments
- Free (no additional costs beyond App Service)

## 🚀 Quick Start

### Development

1. **Install dependencies**:
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```
   Access at: http://localhost:5173

3. **Start API server** (in a separate terminal):
   ```bash
   cd server
   npm run dev
   ```
   API available at: http://localhost:3001

### Building for Production

1. **Build the application**:
   ```bash
   node node_modules\vite\bin\vite.js build
   ```

2. **Create deployment package**:
   ```bash
   node create-deploy-zip.js
   ```

   This creates `azure-deploy.zip` ready for Azure deployment.

## 🌐 Deployment

See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) for detailed deployment instructions for Azure App Service.

### Quick Deploy to Azure

1. Build the deployment package (see above)
2. Upload `azure-deploy.zip` to Azure via Kudu+ ZIP Push Deploy
3. Install server dependencies via Kudu console:
   ```bash
   cd site/wwwroot/server
   npm install --production
   ```
4. Set startup command: `node server/src/index.js`
5. Restart the app

## 🔐 Default Login

After deployment, log in with:
- **Email**: firas.kiftaro@moe.gov.ae
- **Password**: 1234

⚠️ **Change the password immediately after first login!**

## 📊 Data Management

### Storage Location
All data is stored in JSON files at `server/data/`:
- `users.json` - User accounts
- `candidates.json` - Student records
- `courses.json` - Course catalog
- `mentors.json` - Mentors
- `notifications.json` - Notifications
- `audit.json` - Audit logs
- `corrections.json` - Course corrections

### Backup & Export
Use the built-in export features to download data as Excel files regularly.

### Import
Upload Excel files through the app's import features to bulk-add data.

## 🛠️ Technology Stack

- **Frontend**: React, Vite, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express
- **Storage**: Local JSON files
- **Deployment**: Azure App Service
- **Icons**: Lucide React
- **File Processing**: XLSX (SheetJS)

## 📁 Project Structure

```
freshgrad-tracker/
├── public/              # Static assets
│   ├── users.json       # User data backup
│   └── Heros/           # Hero images
├── src/                 # React application
│   ├── components/      # Reusable components
│   ├── pages/           # Page components
│   ├── providers/       # Context providers
│   ├── config/          # Configuration
│   └── utils/           # Helper functions
├── server/              # Backend API
│   └── src/
│       ├── config/      # Storage configuration
│       ├── routes/      # API routes
│       └── services/    # Business logic
├── dist/                # Production build (generated)
└── web.config           # IIS configuration for Azure

## 🧪 Testing

The application is production-ready with:
- ✅ No sample data
- ✅ Single admin user
- ✅ Clean codebase
- ✅ Error handling
- ✅ Audit logging

## 📝 License

Proprietary - UAE Ministry of Education

## 🆘 Support

For issues or questions, check:
- [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) for deployment help
- Application audit logs for user actions
- Azure App Service logs for technical issues
