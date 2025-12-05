-- FreshGrad Tracker Database Schema
-- Version: 1.0
-- Description: Complete database schema for the student journey management system
-- Note: Currently the app uses JSON files for storage. This schema is for PostgreSQL migration.

-- =============================================
-- USERS TABLE
-- Stores system users (Admin, ECAE Manager, ECAE Trainer, Auditor, Teacher)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'ECAE Manager', 'ECAE Trainer', 'Auditor', 'Teacher')),
    verified BOOLEAN DEFAULT FALSE,
    applicant_status VARCHAR(50) DEFAULT 'None',
    docs JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for email lookup during authentication
CREATE INDEX idx_users_email ON users(LOWER(email));
CREATE INDEX idx_users_role ON users(role);

-- =============================================
-- MENTORS TABLE
-- Stores mentor information (teachers who guide candidates during internship)
-- =============================================
CREATE TABLE IF NOT EXISTS mentors (
    id VARCHAR(50) PRIMARY KEY DEFAULT ('M-' || EXTRACT(EPOCH FROM NOW())::BIGINT),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    contact VARCHAR(50),
    subject VARCHAR(100),
    school VARCHAR(255),
    emirate VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mentors_subject ON mentors(subject);
CREATE INDEX idx_mentors_emirate ON mentors(emirate);
CREATE INDEX idx_mentors_school ON mentors(school);

-- =============================================
-- COURSES TABLE
-- Stores training courses (e.g., course codes, weights, pass thresholds)
-- =============================================
CREATE TABLE IF NOT EXISTS courses (
    id VARCHAR(50) PRIMARY KEY DEFAULT ('C-' || EXTRACT(EPOCH FROM NOW())::BIGINT),
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    weight DECIMAL(3,2) DEFAULT 1.0,
    pass_threshold INTEGER DEFAULT 70,
    is_required BOOLEAN DEFAULT FALSE,
    tracks TEXT[] DEFAULT '{}',  -- Array of track IDs (t1, t2, t3)
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_courses_code ON courses(code);
CREATE INDEX idx_courses_active ON courses(active);

-- =============================================
-- CANDIDATES TABLE
-- Main table for tracking student/candidate journey
-- =============================================
CREATE TABLE IF NOT EXISTS candidates (
    id VARCHAR(50) PRIMARY KEY DEFAULT ('C-' || EXTRACT(EPOCH FROM NOW())::BIGINT),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    mobile VARCHAR(50),
    national_id VARCHAR(50),
    emirate VARCHAR(100),
    subject VARCHAR(100),
    gpa DECIMAL(4,2),
    track_id VARCHAR(10) DEFAULT 't1' CHECK (track_id IN ('t1', 't2', 't3')),
    status VARCHAR(50) DEFAULT 'Imported' CHECK (status IN (
        'Imported', 'Eligible', 'Assigned', 'In Training', 
        'Courses Completed', 'Assessed', 'Graduated', 
        'Ready for Hiring', 'Hired/Closed', 'On Hold', 
        'Withdrawn', 'Rejected'
    )),
    sponsor VARCHAR(50) CHECK (sponsor IN ('MOE', 'Mawaheb', 'MBZUH', NULL)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_emirate ON candidates(emirate);
CREATE INDEX idx_candidates_subject ON candidates(subject);
CREATE INDEX idx_candidates_track_id ON candidates(track_id);
CREATE INDEX idx_candidates_sponsor ON candidates(sponsor);

-- =============================================
-- CANDIDATE_ENROLLMENTS TABLE
-- Tracks course enrollments for candidates
-- =============================================
CREATE TABLE IF NOT EXISTS candidate_enrollments (
    id VARCHAR(50) PRIMARY KEY DEFAULT ('ENR-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6)),
    candidate_id VARCHAR(50) NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    course_code VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    cohort VARCHAR(100),
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'Enrolled' CHECK (status IN ('Enrolled', 'In Progress', 'Completed', 'Withdrawn')),
    assigned_by VARCHAR(255),
    assigned_ts TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_internship BOOLEAN DEFAULT FALSE,
    required VARCHAR(20) DEFAULT 'Optional' CHECK (required IN ('Required', 'Optional')),
    type VARCHAR(50),
    -- Internship-specific fields
    mentor_id VARCHAR(50) REFERENCES mentors(id),
    mentor_name VARCHAR(255),
    mentor_email VARCHAR(255),
    mentor_contact VARCHAR(50),
    school_name VARCHAR(255),
    school_emirate VARCHAR(100),
    pass_state VARCHAR(50) DEFAULT 'Not Started' CHECK (pass_state IN ('Not Started', 'In Progress', 'Passed', 'Failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_enrollments_candidate ON candidate_enrollments(candidate_id);
CREATE INDEX idx_enrollments_course ON candidate_enrollments(course_code);
CREATE INDEX idx_enrollments_status ON candidate_enrollments(status);
CREATE INDEX idx_enrollments_internship ON candidate_enrollments(is_internship);

-- =============================================
-- CANDIDATE_COURSE_RESULTS TABLE
-- Stores course results/scores from ECAE
-- =============================================
CREATE TABLE IF NOT EXISTS candidate_course_results (
    id SERIAL PRIMARY KEY,
    candidate_id VARCHAR(50) NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    course_code VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    score DECIMAL(5,2),
    pass BOOLEAN DEFAULT FALSE,
    result_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_results_candidate ON candidate_course_results(candidate_id);
CREATE INDEX idx_results_course ON candidate_course_results(course_code);

-- =============================================
-- CANDIDATE_NOTES TABLE
-- Stores notes/comments thread for candidates
-- =============================================
CREATE TABLE IF NOT EXISTS candidate_notes (
    id VARCHAR(50) PRIMARY KEY DEFAULT ('N-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6)),
    candidate_id VARCHAR(50) NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    by_user VARCHAR(255) NOT NULL,
    by_role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notes_candidate ON candidate_notes(candidate_id);

-- =============================================
-- CORRECTIONS TABLE
-- Stores data correction requests between trainers and admins
-- =============================================
CREATE TABLE IF NOT EXISTS corrections (
    id VARCHAR(50) PRIMARY KEY DEFAULT ('CR-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6)),
    candidate_id VARCHAR(50) REFERENCES candidates(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    by_user VARCHAR(255) NOT NULL,
    by_role VARCHAR(50) NOT NULL,
    for_role VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Resolved', 'Rejected', 'Responded')),
    reject_reason TEXT,
    resolved_ts TIMESTAMP WITH TIME ZONE,
    rejected_ts TIMESTAMP WITH TIME ZONE,
    response JSONB,  -- { by, role, text, ts }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_corrections_candidate ON corrections(candidate_id);
CREATE INDEX idx_corrections_status ON corrections(status);
CREATE INDEX idx_corrections_for_role ON corrections(for_role);

-- =============================================
-- NOTIFICATIONS TABLE
-- Stores in-app notifications
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) PRIMARY KEY DEFAULT ('NTF-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6)),
    to_email VARCHAR(255),
    to_role VARCHAR(50),
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    target JSONB DEFAULT '{}',  -- { page, candidateId, ... }
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_to_email ON notifications(LOWER(to_email));
CREATE INDEX idx_notifications_to_role ON notifications(to_role);
CREATE INDEX idx_notifications_read ON notifications(read);

-- =============================================
-- AUDIT_LOG TABLE
-- Stores all system events for audit purposes
-- =============================================
CREATE TABLE IF NOT EXISTS audit_log (
    id VARCHAR(50) PRIMARY KEY DEFAULT ('E-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6)),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_type ON audit_log(event_type);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- =============================================
-- REFERENCE DATA: TRACKS
-- Static reference data for training tracks
-- =============================================
CREATE TABLE IF NOT EXISTS tracks (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    min_average INTEGER DEFAULT 70
);

INSERT INTO tracks (id, name, min_average) VALUES
    ('t1', 'STEM Core', 70),
    ('t2', 'Languages', 75),
    ('t3', 'ICT', 70)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- REFERENCE DATA: CANDIDATE STATUSES
-- Static reference for valid candidate statuses
-- =============================================
CREATE TABLE IF NOT EXISTS candidate_statuses (
    status VARCHAR(50) PRIMARY KEY,
    display_order INTEGER,
    stage_index INTEGER,
    color_class VARCHAR(100)
);

INSERT INTO candidate_statuses (status, display_order, stage_index, color_class) VALUES
    ('Imported', 1, 0, 'bg-slate-100 text-slate-800'),
    ('Eligible', 2, 0, 'bg-sky-100 text-sky-800'),
    ('Assigned', 3, 1, 'bg-indigo-100 text-indigo-800'),
    ('In Training', 4, 2, 'bg-amber-100 text-amber-800'),
    ('Courses Completed', 5, 2, 'bg-emerald-100 text-emerald-800'),
    ('Assessed', 6, 2, 'bg-teal-100 text-teal-800'),
    ('Graduated', 7, 3, 'bg-green-100 text-green-800'),
    ('Ready for Hiring', 8, 4, 'bg-lime-100 text-lime-800'),
    ('Hired/Closed', 9, 4, 'bg-gray-200 text-gray-800'),
    ('On Hold', 10, 1, 'bg-orange-100 text-orange-800'),
    ('Withdrawn', 11, 0, 'bg-rose-100 text-rose-800'),
    ('Rejected', 12, 0, 'bg-red-100 text-red-800')
ON CONFLICT (status) DO NOTHING;

-- =============================================
-- DEFAULT ADMIN USER
-- Insert default admin user for first login
-- =============================================
INSERT INTO users (email, password, name, role, verified, applicant_status) VALUES
    ('firas.kiftaro@moe.gov.ae', '1234', 'Firas Kiftaro', 'Admin', TRUE, 'None')
ON CONFLICT (email) DO NOTHING;

-- =============================================
-- VIEWS
-- =============================================

-- View: Candidate Summary with computed fields
CREATE OR REPLACE VIEW candidate_summary AS
SELECT 
    c.id,
    c.name,
    c.email,
    c.mobile,
    c.national_id,
    c.emirate,
    c.subject,
    c.gpa,
    c.track_id,
    t.name as track_name,
    c.status,
    c.sponsor,
    c.created_at,
    c.updated_at,
    (SELECT COUNT(*) FROM candidate_enrollments e WHERE e.candidate_id = c.id) as enrollment_count,
    (SELECT COUNT(*) FROM candidate_course_results r WHERE r.candidate_id = c.id) as result_count,
    (SELECT COUNT(*) FROM candidate_notes n WHERE n.candidate_id = c.id) as note_count
FROM candidates c
LEFT JOIN tracks t ON c.track_id = t.id;

-- View: Mentor Assignment Summary
CREATE OR REPLACE VIEW mentor_assignment_summary AS
SELECT 
    m.id,
    m.name,
    m.email,
    m.subject,
    m.school,
    m.emirate,
    (SELECT COUNT(*) FROM candidate_enrollments e 
     WHERE e.mentor_id = m.id AND e.is_internship = TRUE) as active_internships
FROM mentors m;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentors_updated_at BEFORE UPDATE ON mentors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON candidate_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();