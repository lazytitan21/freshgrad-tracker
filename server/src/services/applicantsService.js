/**
 * Applicants Data Access Layer - Azure Blob Storage
 * Note: Applicants are users with role "Teacher"
 */

import { readBlob, writeBlob, BLOB_NAMES } from '../config/storage.js';

/**
 * Get all applicants (users with role "Teacher")
 */
export async function getAllApplicants() {
  const users = await readBlob(BLOB_NAMES.users);
  const applicants = users.filter(u => u.role === 'Teacher');
  
  // Remove passwords
  return applicants.map(user => {
    const { password, ...safe } = user;
    return safe;
  });
}

/**
 * Get applicant by email
 */
export async function getApplicantByEmail(email) {
  const users = await readBlob(BLOB_NAMES.users);
  const normalizedEmail = email.toLowerCase().trim();
  const user = users.find(u => u.email.toLowerCase() === normalizedEmail && u.role === 'Teacher');
  
  if (!user) {
    return null;
  }
  
  const { password, ...safe } = user;
  return safe;
}

/**
 * Get applicants by status
 */
export async function getApplicantsByStatus(status) {
  const users = await readBlob(BLOB_NAMES.users);
  const applicants = users.filter(u => u.role === 'Teacher' && u.applicantStatus === status);
  
  // Remove passwords
  return applicants.map(user => {
    const { password, ...safe } = user;
    return safe;
  });
}

/**
 * Update applicant status
 */
export async function updateApplicantStatus(email, status) {
  const users = await readBlob(BLOB_NAMES.users);
  const normalizedEmail = email.toLowerCase().trim();
  const index = users.findIndex(u => u.email.toLowerCase() === normalizedEmail && u.role === 'Teacher');
  
  if (index === -1) {
    throw new Error(`Applicant ${email} not found`);
  }
  
  users[index].applicantStatus = status;
  users[index].updatedAt = new Date().toISOString();
  
  await writeBlob(BLOB_NAMES.users, users);
  
  const { password, ...safe } = users[index];
  return safe;
}

/**
 * Update applicant documents
 */
export async function updateApplicantDocs(email, docs) {
  const users = await readBlob(BLOB_NAMES.users);
  const normalizedEmail = email.toLowerCase().trim();
  const index = users.findIndex(u => u.email.toLowerCase() === normalizedEmail && u.role === 'Teacher');
  
  if (index === -1) {
    throw new Error(`Applicant ${email} not found`);
  }
  
  users[index].docs = { ...users[index].docs, ...docs };
  users[index].updatedAt = new Date().toISOString();
  
  await writeBlob(BLOB_NAMES.users, users);
  
  const { password, ...safe } = users[index];
  return safe;
}

/**
 * Get applicants who expressed interest
 */
export async function getInterestedApplicants() {
  const users = await readBlob(BLOB_NAMES.users);
  const applicants = users.filter(u => u.role === 'Teacher' && u.interested === true);
  
  // Remove passwords
  return applicants.map(user => {
    const { password, ...safe } = user;
    return safe;
  });
}
