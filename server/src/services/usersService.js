/**
 * Users Data Access Layer - Azure Blob Storage
 */

import { readBlob, writeBlob, BLOB_NAMES } from '../config/storage.js';

/**
 * Get all users
 */
export async function getAllUsers() {
  const users = await readBlob(BLOB_NAMES.users);
  // Remove passwords from response
  return users.map(user => {
    const { password, ...safe } = user;
    return safe;
  });
}

/**
 * Get user by email (with password for authentication)
 */
export async function getUserByEmail(email, includePassword = false) {
  const users = await readBlob(BLOB_NAMES.users);
  const normalizedEmail = email.toLowerCase().trim();
  const user = users.find(u => u.email.toLowerCase() === normalizedEmail);
  
  if (!user) {
    return null;
  }
  
  if (!includePassword) {
    const { password, ...safe } = user;
    return safe;
  }
  
  return user;
}

/**
 * Create new user (registration)
 */
export async function createUser(userData) {
  const users = await readBlob(BLOB_NAMES.users);
  const email = userData.email.toLowerCase().trim();
  
  // Check if user already exists
  const existing = users.find(u => u.email.toLowerCase() === email);
  if (existing) {
    throw new Error('User with this email already exists');
  }
  
  const newUser = {
    ...userData,
    email, // Use normalized email
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    verified: userData.verified || false,
    applicantStatus: userData.applicantStatus || 'None',
    docs: userData.docs || {},
  };
  
  users.push(newUser);
  await writeBlob(BLOB_NAMES.users, users);
  
  // Return without password
  const { password, ...safe } = newUser;
  return safe;
}

/**
 * Update user profile
 */
export async function updateUser(email, updates) {
  const users = await readBlob(BLOB_NAMES.users);
  const normalizedEmail = email.toLowerCase().trim();
  const index = users.findIndex(u => u.email.toLowerCase() === normalizedEmail);
  
  if (index === -1) {
    throw new Error(`User ${email} not found`);
  }
  
  const updated = {
    ...users[index],
    ...updates,
    email: users[index].email, // Preserve email
    updatedAt: new Date().toISOString(),
  };
  
  users[index] = updated;
  await writeBlob(BLOB_NAMES.users, users);
  
  // Return without password
  const { password, ...safe } = updated;
  return safe;
}

/**
 * Delete user
 */
export async function deleteUser(email) {
  const users = await readBlob(BLOB_NAMES.users);
  const normalizedEmail = email.toLowerCase().trim();
  const filtered = users.filter(u => u.email.toLowerCase() !== normalizedEmail);
  
  if (filtered.length === users.length) {
    throw new Error(`User ${email} not found`);
  }
  
  await writeBlob(BLOB_NAMES.users, filtered);
  return { success: true, email: normalizedEmail };
}

/**
 * Get users by role
 */
export async function getUsersByRole(role) {
  const users = await readBlob(BLOB_NAMES.users);
  const filtered = users.filter(u => u.role === role);
  
  // Remove passwords
  return filtered.map(user => {
    const { password, ...safe } = user;
    return safe;
  });
}

/**
 * Authenticate user (login)
 */
export async function authenticateUser(email, password) {
  const user = await getUserByEmail(email, true);
  
  if (!user) {
    throw new Error('Invalid credentials');
  }
  
  if (user.password !== password) {
    throw new Error('Invalid credentials');
  }
  
  // Return user without password
  const { password: _pwd, ...safe } = user;
  return safe;
}

/**
 * Update password
 */
export async function updatePassword(email, newPassword) {
  const users = await readBlob(BLOB_NAMES.users);
  const normalizedEmail = email.toLowerCase().trim();
  const index = users.findIndex(u => u.email.toLowerCase() === normalizedEmail);
  
  if (index === -1) {
    throw new Error(`User ${email} not found`);
  }
  
  users[index].password = newPassword;
  users[index].updatedAt = new Date().toISOString();
  
  await writeBlob(BLOB_NAMES.users, users);
  return { success: true, email: normalizedEmail };
}
