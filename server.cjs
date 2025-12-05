/**
 * FreshGrad Tracker - Production Server
 * Express server with PostgreSQL for Render deployment
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fsSync = require('fs');
const { Pool } = require('pg');

console.log('🚀 Starting Tracker API Server...');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - Allow Render domain and localhost
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.includes('.onrender.com') || origin.includes('localhost')) {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true,
}));

// ========== PostgreSQL Connection ==========
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected:', res.rows[0].now);
  }
});

// ========== Initialize Database Tables ==========
async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('📦 Initializing database tables...');
    
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'Teacher',
        verified BOOLEAN DEFAULT FALSE,
        applicant_status VARCHAR(50) DEFAULT 'None',
        docs JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Candidates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS candidates (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        mobile VARCHAR(50),
        national_id VARCHAR(50),
        emirate VARCHAR(100),
        subject VARCHAR(100),
        gpa DECIMAL(4,2),
        track_id VARCHAR(10) DEFAULT 't1',
        status VARCHAR(50) DEFAULT 'Imported',
        sponsor VARCHAR(50),
        enrollments JSONB DEFAULT '[]',
        course_results JSONB DEFAULT '[]',
        notes_thread JSONB DEFAULT '[]',
        data JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Mentors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS mentors (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        contact VARCHAR(50),
        subject VARCHAR(100),
        school VARCHAR(255),
        emirate VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Courses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id VARCHAR(50) PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        weight DECIMAL(3,2) DEFAULT 1.0,
        pass_threshold INTEGER DEFAULT 70,
        is_required BOOLEAN DEFAULT FALSE,
        tracks TEXT[] DEFAULT '{}',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(50) PRIMARY KEY,
        to_email VARCHAR(255),
        to_role VARCHAR(50),
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        body TEXT,
        target JSONB DEFAULT '{}',
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Audit log table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id VARCHAR(50) PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Corrections table
    await client.query(`
      CREATE TABLE IF NOT EXISTS corrections (
        id VARCHAR(50) PRIMARY KEY,
        candidate_id VARCHAR(50),
        text TEXT NOT NULL,
        by_user VARCHAR(255) NOT NULL,
        by_role VARCHAR(50) NOT NULL,
        for_role VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        reject_reason TEXT,
        response JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default admin user if not exists
    const adminCheck = await client.query(
      'SELECT email FROM users WHERE email = $1',
      ['firas.kiftaro@moe.gov.ae']
    );
    
    if (adminCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO users (email, password, name, role, verified, applicant_status)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['firas.kiftaro@moe.gov.ae', '1234', 'Firas Kiftaro', 'Admin', true, 'None']);
      console.log('👤 Default admin user created');
    }

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  } finally {
    client.release();
  }
}

// ========== API ROUTES ==========

// Health check
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: result.rows[0].now 
    });
  } catch (error) {
    res.json({ 
      status: 'ok', 
      database: 'disconnected',
      timestamp: new Date().toISOString() 
    });
  }
});

// ========== USERS ==========

// Users - Login
app.post('/api/users/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND password = $2',
      [email, password]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const { password: _, ...userWithoutPassword } = user;
    
    // Convert snake_case to camelCase for frontend
    const response = {
      email: user.email,
      name: user.name,
      role: user.role,
      verified: user.verified,
      applicantStatus: user.applicant_status,
      docs: user.docs,
      createdAt: user.created_at
    };
    
    console.log('✅ Login successful:', user.email);
    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Users - Register
app.post('/api/users/auth/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    // Check if user exists
    const existing = await pool.query(
      'SELECT email FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    const result = await pool.query(`
      INSERT INTO users (email, password, name, role, verified, applicant_status)
      VALUES (LOWER($1), $2, $3, $4, $5, $6)
      RETURNING *
    `, [email, password, name, role || 'Teacher', true, 'None']);
    
    const user = result.rows[0];
    const response = {
      email: user.email,
      name: user.name,
      role: user.role,
      verified: user.verified,
      applicantStatus: user.applicant_status,
      createdAt: user.created_at
    };
    
    console.log('✅ User registered:', user.email);
    res.status(201).json(response);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Users - Get all
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    const users = result.rows.map(u => ({
      email: u.email,
      name: u.name,
      role: u.role,
      verified: u.verified,
      applicantStatus: u.applicant_status,
      docs: u.docs,
      createdAt: u.created_at
    }));
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Users - Update
app.put('/api/users/:email', async (req, res) => {
  try {
    const { name, role, password, verified } = req.body;
    const result = await pool.query(`
      UPDATE users 
      SET name = COALESCE($1, name),
          role = COALESCE($2, role),
          password = COALESCE($3, password),
          verified = COALESCE($4, verified),
          updated_at = CURRENT_TIMESTAMP
      WHERE LOWER(email) = LOWER($5)
      RETURNING *
    `, [name, role, password, verified, req.params.email]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    res.json({
      email: user.email,
      name: user.name,
      role: user.role,
      verified: user.verified,
      applicantStatus: user.applicant_status
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Users - Delete
app.delete('/api/users/:email', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE LOWER(email) = LOWER($1)', [req.params.email]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ========== CANDIDATES ==========

// Candidates - Get all
app.get('/api/candidates', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM candidates ORDER BY created_at DESC');
    const candidates = result.rows.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      mobile: c.mobile,
      nationalId: c.national_id,
      emirate: c.emirate,
      subject: c.subject,
      gpa: parseFloat(c.gpa) || 0,
      trackId: c.track_id,
      status: c.status,
      sponsor: c.sponsor,
      enrollments: c.enrollments || [],
      courseResults: c.course_results || [],
      notesThread: c.notes_thread || [],
      ...c.data,
      createdAt: c.created_at
    }));
    res.json(candidates);
  } catch (error) {
    console.error('Get candidates error:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// Candidates - Get by ID
app.get('/api/candidates/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM candidates WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    const c = result.rows[0];
    res.json({
      id: c.id,
      name: c.name,
      email: c.email,
      mobile: c.mobile,
      nationalId: c.national_id,
      emirate: c.emirate,
      subject: c.subject,
      gpa: parseFloat(c.gpa) || 0,
      trackId: c.track_id,
      status: c.status,
      sponsor: c.sponsor,
      enrollments: c.enrollments || [],
      courseResults: c.course_results || [],
      notesThread: c.notes_thread || [],
      ...c.data,
      createdAt: c.created_at
    });
  } catch (error) {
    console.error('Get candidate error:', error);
    res.status(500).json({ error: 'Failed to fetch candidate' });
  }
});

// Candidates - Create
app.post('/api/candidates', async (req, res) => {
  try {
    const { 
      name, email, mobile, nationalId, emirate, subject, gpa, 
      trackId, status, sponsor, enrollments, courseResults, notesThread,
      ...extraData 
    } = req.body;
    
    const id = `C-${Date.now()}`;
    
    const result = await pool.query(`
      INSERT INTO candidates (id, name, email, mobile, national_id, emirate, subject, gpa, track_id, status, sponsor, enrollments, course_results, notes_thread, data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      id,
      name,
      email,
      mobile,
      nationalId,
      emirate,
      subject,
      gpa || 0,
      trackId || 't1',
      status || 'Imported',
      sponsor,
      JSON.stringify(enrollments || []),
      JSON.stringify(courseResults || []),
      JSON.stringify(notesThread || []),
      JSON.stringify(extraData)
    ]);
    
    const c = result.rows[0];
    res.status(201).json({
      id: c.id,
      name: c.name,
      email: c.email,
      mobile: c.mobile,
      nationalId: c.national_id,
      emirate: c.emirate,
      subject: c.subject,
      gpa: parseFloat(c.gpa) || 0,
      trackId: c.track_id,
      status: c.status,
      sponsor: c.sponsor,
      enrollments: c.enrollments || [],
      courseResults: c.course_results || [],
      notesThread: c.notes_thread || [],
      createdAt: c.created_at
    });
  } catch (error) {
    console.error('Create candidate error:', error);
    res.status(500).json({ error: 'Failed to create candidate' });
  }
});

// Candidates - Update
app.put('/api/candidates/:id', async (req, res) => {
  try {
    const { 
      name, email, mobile, nationalId, emirate, subject, gpa, 
      trackId, status, sponsor, enrollments, courseResults, notesThread,
      ...extraData 
    } = req.body;
    
    const result = await pool.query(`
      UPDATE candidates SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        mobile = COALESCE($3, mobile),
        national_id = COALESCE($4, national_id),
        emirate = COALESCE($5, emirate),
        subject = COALESCE($6, subject),
        gpa = COALESCE($7, gpa),
        track_id = COALESCE($8, track_id),
        status = COALESCE($9, status),
        sponsor = COALESCE($10, sponsor),
        enrollments = COALESCE($11, enrollments),
        course_results = COALESCE($12, course_results),
        notes_thread = COALESCE($13, notes_thread),
        data = COALESCE($14, data),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *
    `, [
      name,
      email,
      mobile,
      nationalId,
      emirate,
      subject,
      gpa,
      trackId,
      status,
      sponsor,
      enrollments ? JSON.stringify(enrollments) : null,
      courseResults ? JSON.stringify(courseResults) : null,
      notesThread ? JSON.stringify(notesThread) : null,
      Object.keys(extraData).length > 0 ? JSON.stringify(extraData) : null,
      req.params.id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    
    const c = result.rows[0];
    res.json({
      id: c.id,
      name: c.name,
      email: c.email,
      mobile: c.mobile,
      nationalId: c.national_id,
      emirate: c.emirate,
      subject: c.subject,
      gpa: parseFloat(c.gpa) || 0,
      trackId: c.track_id,
      status: c.status,
      sponsor: c.sponsor,
      enrollments: c.enrollments || [],
      courseResults: c.course_results || [],
      notesThread: c.notes_thread || [],
      ...c.data,
      createdAt: c.created_at
    });
  } catch (error) {
    console.error('Update candidate error:', error);
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

// Candidates - Delete
app.delete('/api/candidates/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM candidates WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete candidate error:', error);
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});

// ========== COURSES ==========

// Courses - Get all
app.get('/api/courses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM courses WHERE active = true ORDER BY code');
    const courses = result.rows.map(c => ({
      id: c.id,
      code: c.code,
      title: c.title,
      description: c.description,
      weight: parseFloat(c.weight) || 1,
      passThreshold: c.pass_threshold || 70,
      isRequired: c.is_required,
      tracks: c.tracks || [],
      active: c.active,
      createdAt: c.created_at
    }));
    res.json(courses);
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Courses - Create
app.post('/api/courses', async (req, res) => {
  try {
    const { code, title, description, weight, passThreshold, isRequired, tracks } = req.body;
    const id = `CR-${Date.now()}`;
    
    const result = await pool.query(`
      INSERT INTO courses (id, code, title, description, weight, pass_threshold, is_required, tracks)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [id, code, title, description, weight || 1, passThreshold || 70, isRequired || false, tracks || []]);
    
    const c = result.rows[0];
    res.status(201).json({
      id: c.id,
      code: c.code,
      title: c.title,
      description: c.description,
      weight: parseFloat(c.weight) || 1,
      passThreshold: c.pass_threshold,
      isRequired: c.is_required,
      tracks: c.tracks || [],
      active: c.active,
      createdAt: c.created_at
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Courses - Update
app.put('/api/courses/:id', async (req, res) => {
  try {
    const { code, title, description, weight, passThreshold, isRequired, tracks, active } = req.body;
    
    const result = await pool.query(`
      UPDATE courses SET
        code = COALESCE($1, code),
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        weight = COALESCE($4, weight),
        pass_threshold = COALESCE($5, pass_threshold),
        is_required = COALESCE($6, is_required),
        tracks = COALESCE($7, tracks),
        active = COALESCE($8, active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [code, title, description, weight, passThreshold, isRequired, tracks, active, req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    const c = result.rows[0];
    res.json({
      id: c.id,
      code: c.code,
      title: c.title,
      description: c.description,
      weight: parseFloat(c.weight) || 1,
      passThreshold: c.pass_threshold,
      isRequired: c.is_required,
      tracks: c.tracks || [],
      active: c.active
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Courses - Delete
app.delete('/api/courses/:id', async (req, res) => {
  try {
    await pool.query('UPDATE courses SET active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// ========== MENTORS ==========

// Mentors - Get all
app.get('/api/mentors', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM mentors ORDER BY name');
    const mentors = result.rows.map(m => ({
      id: m.id,
      name: m.name,
      email: m.email,
      contact: m.contact,
      subject: m.subject,
      school: m.school,
      emirate: m.emirate,
      createdAt: m.created_at
    }));
    res.json(mentors);
  } catch (error) {
    console.error('Get mentors error:', error);
    res.status(500).json({ error: 'Failed to fetch mentors' });
  }
});

// Mentors - Create
app.post('/api/mentors', async (req, res) => {
  try {
    const { name, email, contact, subject, school, emirate } = req.body;
    const id = `M-${Date.now()}`;
    
    const result = await pool.query(`
      INSERT INTO mentors (id, name, email, contact, subject, school, emirate)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [id, name, email, contact, subject, school, emirate]);
    
    const m = result.rows[0];
    res.status(201).json({
      id: m.id,
      name: m.name,
      email: m.email,
      contact: m.contact,
      subject: m.subject,
      school: m.school,
      emirate: m.emirate,
      createdAt: m.created_at
    });
  } catch (error) {
    console.error('Create mentor error:', error);
    res.status(500).json({ error: 'Failed to create mentor' });
  }
});

// Mentors - Update
app.put('/api/mentors/:id', async (req, res) => {
  try {
    const { name, email, contact, subject, school, emirate } = req.body;
    
    const result = await pool.query(`
      UPDATE mentors SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        contact = COALESCE($3, contact),
        subject = COALESCE($4, subject),
        school = COALESCE($5, school),
        emirate = COALESCE($6, emirate),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [name, email, contact, subject, school, emirate, req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mentor not found' });
    }
    
    const m = result.rows[0];
    res.json({
      id: m.id,
      name: m.name,
      email: m.email,
      contact: m.contact,
      subject: m.subject,
      school: m.school,
      emirate: m.emirate
    });
  } catch (error) {
    console.error('Update mentor error:', error);
    res.status(500).json({ error: 'Failed to update mentor' });
  }
});

// Mentors - Delete
app.delete('/api/mentors/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM mentors WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete mentor error:', error);
    res.status(500).json({ error: 'Failed to delete mentor' });
  }
});

// ========== Serve Static Files ==========
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
      res.status(404).send('Frontend not deployed. Run: npm run build');
    }
  });
}

// ========== Start Server ==========
const PORT = process.env.PORT || 8080;

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
