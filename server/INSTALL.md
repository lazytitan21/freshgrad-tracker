# Installing Backend Dependencies

## Prerequisites

- **Node.js 18+** installed
- **npm** package manager
- **Azure Cosmos DB account** (see COSMOS-DB-QUICKSTART.md)

---

## Step 1: Install Backend Dependencies

```powershell
cd server
npm install
```

This will install:
- `@azure/cosmos@^4.0.0` - Azure Cosmos DB SDK
- `@azure/identity@^4.0.0` - Azure authentication
- `express@^4.18.2` - Web framework
- `cors@^2.8.5` - CORS middleware
- `dotenv@^16.3.1` - Environment variables
- `helmet@^7.1.0` - Security middleware
- `morgan@^1.10.0` - HTTP logging

---

## Step 2: Configure Environment

```powershell
copy .env.example .env
```

Edit `.env` with your Azure Cosmos DB credentials:

```env
COSMOS_ENDPOINT=https://your-cosmos-account.documents.azure.com:443/
COSMOS_KEY=your-primary-key-here
COSMOS_DATABASE_NAME=FreshGradTrackerDB
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
USE_MANAGED_IDENTITY=false
```

---

## Step 3: Start Backend Server

```powershell
npm start
```

Or for development with auto-reload:

```powershell
npm run dev
```

---

## Step 4: Verify Installation

You should see output like:

```
🚀 Starting FreshGrad Tracker API Server...
📝 Environment: development
🔑 Using Key-based authentication for Cosmos DB
📦 Initializing database: FreshGradTrackerDB
✅ Database ready: FreshGradTrackerDB
✅ Container ready: Candidates (partition: /id)
✅ Container ready: Mentors (partition: /id)
✅ Container ready: Courses (partition: /id)
✅ Container ready: Users (partition: /email)
✅ Container ready: Applicants (partition: /email)
✅ Container ready: AuditLogs (partition: /type)
✅ Container ready: Notifications (partition: /to/email)
✅ Container ready: Corrections (partition: /candidateId)
🎉 Database initialization complete
✅ Server running on port 3001
🌐 API available at http://localhost:3001/api
❤️ Health check: http://localhost:3001/health
```

---

## Step 5: Test Health Endpoint

Open a new terminal and run:

```powershell
curl http://localhost:3001/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-11-19T..."}
```

---

## Troubleshooting

### "Cannot find module '@azure/cosmos'"
```powershell
cd server
npm install
```

### "COSMOS_ENDPOINT is required"
- Make sure `.env` file exists in `server/` folder
- Verify the environment variables are set correctly

### "Port 3001 is already in use"
- Change PORT in `.env` to a different port (e.g., 3002)
- Or kill the process using port 3001

### "Authentication failed"
- Verify your COSMOS_ENDPOINT and COSMOS_KEY are correct
- Check Azure Portal → Cosmos DB → Keys for correct values

---

## Next Steps

Once the backend is running:

1. Install frontend dependencies: `npm install` (in root folder)
2. Configure frontend: `copy .env.example .env` (in root folder)
3. Start frontend: `npm run dev`
4. Test the complete application

See [COSMOS-DB-QUICKSTART.md](../COSMOS-DB-QUICKSTART.md) for more details.
