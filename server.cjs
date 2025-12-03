/**
 * Azure IISNode Entry Point
 * Standalone Express server for Azure deployment
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

console.log('🚀 Starting FreshGrad Tracker API Server...');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - Allow Azure domain
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.includes('.azurewebsites.net') || origin.includes('localhost')) {
      return callback(null, true);
    }
    callback(null, true); // Allow all for now
  },
  credentials: true,
}));

// Data directory
const DATA_DIR = path.join(__dirname, 'server', 'data');

// Initialize storage
async function initStorage() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    const files = {
      'users.json': JSON.stringify([{
        email: "firas.kiftaro@moe.gov.ae",
        password: "1234",
        role: "Admin",
        name: "Firas Kiftaro",
        createdAt: new Date().toISOString(),
        verified: true,
        applicantStatus: "None",
        docs: {}
      }], null, 2),
      'candidates.json': '[]',
      'courses.json': '[]',
      'mentors.json': '[]',
      'notifications.json': '[]',
      'audit.json': '[]',
      'corrections.json': '[]'
    };
    
    for (const [fileName, content] of Object.entries(files)) {
      const filePath = path.join(DATA_DIR, fileName);
      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, content, 'utf8');
        console.log(`📝 Created: ${fileName}`);
      }
    }
    
    console.log('✅ Storage initialized');
  } catch (error) {
    console.error('❌ Storage init failed:', error);
  }
}

// Helper to read JSON file
async function readJSON(fileName) {
  try {
    const filePath = path.join(DATA_DIR, fileName);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${fileName}:`, error);
    return [];
  }
}

// Helper to write JSON file
async function writeJSON(fileName, data) {
  try {
    const filePath = path.join(DATA_DIR, fileName);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing ${fileName}:`, error);
  }
}

// ========== API ROUTES ==========

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Users - Login
app.post('/api/users/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = await readJSON('users.json');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    console.log('✅ Login successful:', user.email);
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Users - Register
app.post('/api/users/auth/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const users = await readJSON('users.json');
    
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    const newUser = {
      email: email.toLowerCase(),
      password,
      name,
      role: role || 'Teacher',
      createdAt: new Date().toISOString(),
      verified: true,
      applicantStatus: 'None',
      docs: {}
    };
    
    users.push(newUser);
    await writeJSON('users.json', users);
    
    const { password: _, ...userWithoutPassword } = newUser;
    console.log('✅ User registered:', newUser.email);
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Users - Get all
app.get('/api/users', async (req, res) => {
  try {
    const users = await readJSON('users.json');
    const usersWithoutPasswords = users.map(u => {
      const { password, ...safe } = u;
      return safe;
    });
    res.json(usersWithoutPasswords);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Candidates - Get all
app.get('/api/candidates', async (req, res) => {
  try {
    const candidates = await readJSON('candidates.json');
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// Candidates - Create
app.post('/api/candidates', async (req, res) => {
  try {
    const candidates = await readJSON('candidates.json');
    const newCandidate = {
      id: `C-${Date.now()}`,
      ...req.body,
      createdAt: new Date().toISOString()
    };
    candidates.push(newCandidate);
    await writeJSON('candidates.json', candidates);
    res.status(201).json(newCandidate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create candidate' });
  }
});

// Candidates - Update
app.put('/api/candidates/:id', async (req, res) => {
  try {
    const candidates = await readJSON('candidates.json');
    const index = candidates.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    candidates[index] = { ...candidates[index], ...req.body };
    await writeJSON('candidates.json', candidates);
    res.json(candidates[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

// Candidates - Delete
app.delete('/api/candidates/:id', async (req, res) => {
  try {
    const candidates = await readJSON('candidates.json');
    const filtered = candidates.filter(c => c.id !== req.params.id);
    await writeJSON('candidates.json', filtered);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});

// Courses - Get all
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await readJSON('courses.json');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Courses - Create
app.post('/api/courses', async (req, res) => {
  try {
    const courses = await readJSON('courses.json');
    const newCourse = {
      id: `CR-${Date.now()}`,
      ...req.body,
      createdAt: new Date().toISOString()
    };
    courses.push(newCourse);
    await writeJSON('courses.json', courses);
    res.status(201).json(newCourse);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Mentors - Get all
app.get('/api/mentors', async (req, res) => {
  try {
    const mentors = await readJSON('mentors.json');
    res.json(mentors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch mentors' });
  }
});

// Mentors - Create
app.post('/api/mentors', async (req, res) => {
  try {
    const mentors = await readJSON('mentors.json');
    const newMentor = {
      id: `M-${Date.now()}`,
      ...req.body,
      createdAt: new Date().toISOString()
    };
    mentors.push(newMentor);
    await writeJSON('mentors.json', mentors);
    res.status(201).json(newMentor);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create mentor' });
  }
});

// Serve static files
const distDir = path.join(__dirname, 'dist');
if (fsSync.existsSync(distDir)) {
  app.use(express.static(distDir));
  
  // SPA fallback
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(distDir, 'index.html'));
    } else {
      res.status(404).json({ error: 'API route not found' });
    }
  });
} else {
  console.warn('⚠️ dist folder not found - API only mode');
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.status(404).send('Frontend not deployed');
    }
  });
}

// Start server
const PORT = process.env.PORT || process.env.HTTP_PLATFORM_PORT || 8080;

initStorage().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
