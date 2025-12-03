# FreshGrad Tracker Backend API

Backend API service for FreshGrad Tracker using Azure Cosmos DB.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Update the values with your Azure Cosmos DB credentials:
     ```env
     COSMOS_ENDPOINT=https://your-cosmos-account.documents.azure.com:443/
     COSMOS_KEY=your-cosmos-primary-key-here
     COSMOS_DATABASE_NAME=FreshGradTrackerDB
     PORT=3001
     ```

3. **Start the server:**
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Candidates
- `GET /api/candidates` - Get all candidates
- `GET /api/candidates/:id` - Get candidate by ID
- `POST /api/candidates` - Create new candidate
- `PUT /api/candidates/:id` - Update candidate
- `DELETE /api/candidates/:id` - Delete candidate
- `GET /api/candidates/status/:status` - Get candidates by status
- `POST /api/candidates/bulk` - Bulk create candidates

### Mentors
- `GET /api/mentors` - Get all mentors
- `GET /api/mentors/:id` - Get mentor by ID
- `POST /api/mentors` - Create new mentor
- `PUT /api/mentors/:id` - Update mentor
- `DELETE /api/mentors/:id` - Delete mentor
- `GET /api/mentors/subject/:subject` - Get mentors by subject

### Courses
- `GET /api/courses` - Get all active courses
- `GET /api/courses/:id` - Get course by ID
- `GET /api/courses/code/:code` - Get course by code
- `POST /api/courses` - Create new course
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course (soft delete)
- `GET /api/courses/track/:trackId` - Get courses by track

### Users
- `POST /api/users/auth/login` - User login
- `POST /api/users/auth/register` - User registration
- `GET /api/users` - Get all users
- `GET /api/users/:email` - Get user by email
- `PUT /api/users/:email` - Update user profile
- `DELETE /api/users/:email` - Delete user
- `GET /api/users/role/:role` - Get users by role
- `POST /api/users/:email/password` - Update password

### Applicants
- `GET /api/applicants` - Get all applicants
- `GET /api/applicants/:email` - Get applicant by email
- `GET /api/applicants/status/:status` - Get applicants by status
- `PATCH /api/applicants/:email/status` - Update applicant status
- `PATCH /api/applicants/:email/docs` - Update applicant documents
- `GET /api/applicants/filter/interested` - Get interested applicants

## Database Structure

The API uses Azure Cosmos DB with the following containers:

- **Candidates** - Partition key: `/id`
- **Mentors** - Partition key: `/id`
- **Courses** - Partition key: `/id`
- **Users** - Partition key: `/email`
- **Applicants** - Stored in Users container with `role: "Teacher"`
- **AuditLogs** - Partition key: `/type`
- **Notifications** - Partition key: `/to/email`
- **Corrections** - Partition key: `/candidateId`

## Deployment

See the main project's COSMOS-DB-DEPLOYMENT.md for deployment instructions to Azure Web Apps.
