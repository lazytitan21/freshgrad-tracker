/**
 * Local File Storage Configuration
 * Simple JSON file storage on local filesystem for Azure App Service
 * Free and persistent on Azure App Service
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory - will be created in the server root
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');

// File names (JSON files)
export const BLOB_NAMES = {
  candidates: 'candidates.json',
  mentors: 'mentors.json',
  courses: 'courses.json',
  users: 'users.json',
  audit: 'audit.json',
  notifications: 'notifications.json',
  corrections: 'corrections.json',
};

// Initial data for users
const INITIAL_USERS = [
  {
    email: "firas.kiftaro@moe.gov.ae",
    password: "1234",
    role: "Admin",
    name: "Firas Kiftaro",
    createdAt: new Date().toISOString(),
    verified: true,
    applicantStatus: "None",
    docs: {}
  }
];

/**
 * Initialize storage directory and files
 */
export async function initializeStorage() {
  try {
    console.log(`📦 Initializing local storage: ${DATA_DIR}`);
    
    // Create data directory if it doesn't exist
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log(`✅ Data directory ready: ${DATA_DIR}`);
    
    // Initialize JSON files if they don't exist
    for (const [key, fileName] of Object.entries(BLOB_NAMES)) {
      const filePath = path.join(DATA_DIR, fileName);
      try {
        await fs.access(filePath);
      } catch (error) {
        // File doesn't exist, create it
        console.log(`📝 Creating initial file: ${fileName}`);
        const initialData = key === 'users' ? INITIAL_USERS : [];
        await fs.writeFile(filePath, JSON.stringify(initialData, null, 2), 'utf8');
      }
    }
    
    console.log('🎉 Storage initialization complete');
    return true;
  } catch (error) {
    console.error('❌ Storage initialization failed:', error.message);
    throw error;
  }
}

/**
 * Read JSON data from file
 */
export async function readBlob(fileName) {
  try {
    const filePath = path.join(DATA_DIR, fileName);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      // File doesn't exist, return empty array
      return [];
    }
    
    const fileContent = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContent || '[]');
  } catch (error) {
    console.error(`Error reading file ${fileName}:`, error);
    return [];
  }
}

/**
 * Write JSON data to file
 */
export async function writeBlob(fileName, data) {
  try {
    const filePath = path.join(DATA_DIR, fileName);
    const content = JSON.stringify(data, null, 2);
    
    await fs.writeFile(filePath, content, 'utf8');
    
    return true;
  } catch (error) {
    console.error(`Error writing file ${fileName}:`, error);
    throw error;
  }
}
