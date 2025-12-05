# 🧪 Quick Test Guide - Before & After Deployment

## 🎯 Purpose
Verify that data now persists on the server and is accessible across browsers/devices.

---

## ✅ Test 1: Local Testing (Before Deployment)

### Start the Server
```bash
cd e:\Test\server
npm install
npm start
```
Server should start on port 3001.

### Start the Frontend (in another terminal)
```bash
cd e:\Test
npm run dev
```
Frontend should start on http://localhost:5173

### Test Flow
1. **Open in Chrome**
   - Go to: http://localhost:5173
   - Login: `firas.kiftaro@moe.gov.ae` / `1234`
   - Add a candidate (any details)
   - Check console for: `✅ Added candidate`
   
2. **Open in Edge (same computer)**
   - Go to: http://localhost:5173
   - Login with same credentials
   - ✅ Should see the candidate from Chrome
   - Add another candidate
   - Check console for: `✅ Added candidate`
   
3. **Refresh Chrome**
   - ✅ Should see both candidates
   
4. **Close all browsers, reopen**
   - Login again
   - ✅ All data still there

5. **Check Server Files**
   ```bash
   cd e:\Test\server\data
   dir
   ```
   You should see:
   - `candidates.json` - Contains both candidates
   - `users.json` - Contains admin user
   - `courses.json`, `mentors.json`, etc.

   Open `candidates.json` to verify data is stored.

---

## ✅ Test 2: Azure Testing (After Deployment)

### Deploy First
Follow steps in FULL-FIX-COMPLETE.md to deploy azure-deploy.zip

### Test Cross-Browser Access

#### Computer 1 - Chrome
1. Go to: https://tracker-test-ene6etgrf9hacedd.canadacentral-01.azurewebsites.net
2. Login: `firas.kiftaro@moe.gov.ae` / `1234`
3. Add a test candidate:
   - Name: "Test Student 1"
   - Email: "test1@example.com"
   - Subject: "Computer Science"
   - Track: Any track
4. Click "Add Candidate"
5. ✅ Candidate appears in list

#### Computer 1 - Edge
1. Open Edge browser
2. Go to same URL
3. Login with same credentials
4. ✅ Should see "Test Student 1"
5. Add another candidate:
   - Name: "Test Student 2"
   - Email: "test2@example.com"
6. ✅ Both students visible

#### Computer 2 - Any Browser (different computer/phone)
1. Go to same URL
2. Login with same credentials
3. ✅ Should see both test students
4. Add "Test Student 3"

#### Back to Computer 1 - Chrome
1. Refresh the page
2. ✅ Should see all 3 students

---

## ✅ Test 3: Data Persistence

### Test Data Survives Restarts
1. Note down the candidates you added
2. In Azure Portal:
   - Go to Tracker-Test app
   - Click "Restart"
   - Wait for restart to complete
3. Open browser and login
4. ✅ All candidates still there

### Test Data Storage
1. Go to Kudu Console: https://tracker-test-ene6etgrf9hacedd.scm.canadacentral-01.azurewebsites.net
2. Navigate to: `site/wwwroot/server/data`
3. Open `candidates.json`
4. ✅ Should see all test candidates stored in JSON format

---

## ✅ Test 4: User Management (Admin Functions)

### Test Admin Can Manage Users
1. Login as admin
2. Go to Users Management page
3. Add a new teacher:
   - Name: "Test Teacher"
   - Email: "teacher@moe.gov.ae"
   - Role: "Teacher"
   - Password: "test1234"
4. ✅ User appears in list

### Test New User Can Login
1. Logout
2. Login with new teacher credentials:
   - Email: "teacher@moe.gov.ae"
   - Password: "test1234"
3. ✅ Successfully logged in
4. ✅ Can see dashboard (teacher view)

---

## ✅ Test 5: Courses & Mentors

### Test Courses Management
1. Login as admin
2. Navigate to Courses section
3. Add a test course:
   - Code: "CS101"
   - Title: "Introduction to Programming"
   - Credits: 3
4. ✅ Course appears
5. Switch browser, refresh
6. ✅ Course visible in other browser

### Test Mentors Management
1. Navigate to Mentors page
2. Add a mentor:
   - Name: "John Doe"
   - Email: "john@school.ae"
   - Subject: "Computer Science"
   - School: "Test School"
   - Emirate: "Dubai"
3. ✅ Mentor appears
4. Switch browser, refresh
5. ✅ Mentor visible

---

## ✅ Test 6: Console Logs (Developer Check)

Open browser console (F12) and check for these logs:

### On Page Load
```
✅ Loaded candidates from server
✅ Loaded courses from server
✅ Loaded mentors from server
```

### When Adding Candidate
```
✅ Added candidate
```

### When Updating Candidate
```
✅ Synced candidate to server
```

### When Login
```
✅ Login successful: firas.kiftaro@moe.gov.ae
```

### If any ❌ errors appear:
Check network tab (F12 → Network) for failed API calls.

---

## ⚠️ Common Issues & Solutions

### Issue: Data not appearing in other browser
**Check:**
1. Are you logged in with the same account?
2. Check browser console for API errors
3. Verify server is running (Azure or local)
4. Check Network tab for failed requests

**Solution:**
```bash
# In Kudu console
cd site/wwwroot/server
node src/index.js
```
Should see "Server running on port 3001"

### Issue: "Failed to load candidates" error
**Check:**
1. Server logs in Kudu
2. Check if `server/data/candidates.json` exists
3. Check file permissions

**Solution:**
```bash
# Create data directory if missing
cd site/wwwroot/server
mkdir data
node src/index.js
```

### Issue: Changes not saving
**Check:**
1. Browser console for sync errors
2. Network tab - are PUT/POST requests failing?
3. Server logs for errors

**Solution:**
Check Azure logs:
- Azure Portal → Tracker-Test
- Monitoring → Log Stream

---

## 📊 Success Criteria

Your app is working correctly if:
- ✅ Data visible across all browsers
- ✅ Data persists after browser close/reopen
- ✅ Data survives app restart
- ✅ Multiple users can access same data
- ✅ All CRUD operations work (Create, Read, Update, Delete)
- ✅ Console shows `✅` success logs, no `❌` errors

---

## 🎉 Final Validation

### Before Migration (localStorage)
- ❌ Data only in one browser
- ❌ Lost when clearing browser data
- ❌ Not accessible from other devices

### After Migration (Server API)
- ✅ Data accessible from all browsers
- ✅ Persists permanently on server
- ✅ Accessible from any device
- ✅ Shared between all users

---

## 📝 Test Report Template

```
Date: ______________
Tester: ____________

Test 1: Local Testing
[ ] Server starts successfully
[ ] Frontend connects to server
[ ] Data visible across browsers
[ ] Data persists after restart

Test 2: Azure Testing
[ ] Deployment successful
[ ] App accessible online
[ ] Cross-browser access works
[ ] Data syncs across devices

Test 3: Data Persistence
[ ] Data survives app restart
[ ] Data stored in JSON files
[ ] No data loss

Test 4: User Management
[ ] Admin can add users
[ ] New users can login
[ ] Roles work correctly

Test 5: Courses & Mentors
[ ] Can add/edit courses
[ ] Can add/edit mentors
[ ] Changes sync across browsers

Test 6: Console Logs
[ ] No errors in console
[ ] Success logs appear
[ ] API calls succeed

Overall Status: ✅ PASS / ❌ FAIL
Notes: _______________________
```

---

## 🚀 You're Ready!

After completing these tests successfully:
1. Change admin password
2. Remove test data
3. Start using the app in production!
