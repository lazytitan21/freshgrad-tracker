/**
 * API Configuration
 * Central configuration for all backend API endpoints
 */

// API Base URL - uses relative path in production, localhost in development
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:3001/api');

export const API_ENDPOINTS = {
  // Candidates
  candidates: `${API_BASE_URL}/candidates`,
  candidateById: (id) => `${API_BASE_URL}/candidates/${id}`,
  candidatesByStatus: (status) => `${API_BASE_URL}/candidates/status/${status}`,
  candidatesBulk: `${API_BASE_URL}/candidates/bulk`,
  
  // Mentors
  mentors: `${API_BASE_URL}/mentors`,
  mentorById: (id) => `${API_BASE_URL}/mentors/${id}`,
  mentorsBySubject: (subject) => `${API_BASE_URL}/mentors/subject/${subject}`,
  
  // Courses
  courses: `${API_BASE_URL}/courses`,
  courseById: (id) => `${API_BASE_URL}/courses/${id}`,
  courseByCode: (code) => `${API_BASE_URL}/courses/code/${code}`,
  coursesByTrack: (trackId) => `${API_BASE_URL}/courses/track/${trackId}`,
  
  // Users & Authentication
  login: `${API_BASE_URL}/users/auth/login`,
  register: `${API_BASE_URL}/users/auth/register`,
  users: `${API_BASE_URL}/users`,
  userByEmail: (email) => `${API_BASE_URL}/users/${email}`,
  usersByRole: (role) => `${API_BASE_URL}/users/role/${role}`,
  updatePassword: (email) => `${API_BASE_URL}/users/${email}/password`,
  
  // Applicants
  applicants: `${API_BASE_URL}/applicants`,
  applicantByEmail: (email) => `${API_BASE_URL}/applicants/${email}`,
  applicantsByStatus: (status) => `${API_BASE_URL}/applicants/status/${status}`,
  applicantStatus: (email) => `${API_BASE_URL}/applicants/${email}/status`,
  applicantDocs: (email) => `${API_BASE_URL}/applicants/${email}/docs`,
  interestedApplicants: `${API_BASE_URL}/applicants/filter/interested`,
};

/**
 * Generic API request helper
 * Handles common HTTP methods with proper error handling
 */
export async function apiRequest(url, options = {}) {
  try {
    console.log('📡 API Request:', options.method || 'GET', url);
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };
    
    const response = await fetch(url, config);
    
    console.log('📡 API Response:', response.status, response.statusText);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      console.error('❌ API Error:', error);
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Handle empty responses (e.g., 204 No Content)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('⚠️ Non-JSON response, content-type:', contentType);
      return null;
    }
    
    const data = await response.json();
    console.log('✅ API Data received:', data ? 'Data exists' : 'No data');
    return data;
  } catch (error) {
    console.error('❌ API Request Error:', error);
    throw error;
  }
}

/**
 * HTTP Method helpers
 */
export const api = {
  get: (url) => apiRequest(url, { method: 'GET' }),
  
  post: (url, data) => apiRequest(url, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  put: (url, data) => apiRequest(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  patch: (url, data) => apiRequest(url, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  
  delete: (url) => apiRequest(url, { method: 'DELETE' }),
};

export default API_ENDPOINTS;
