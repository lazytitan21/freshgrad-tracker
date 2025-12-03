/**
 * Mentors Data Access Layer - Azure Blob Storage
 */

import { readBlob, writeBlob, BLOB_NAMES } from '../config/storage.js';

/**
 * Get all mentors
 */
export async function getAllMentors() {
  const mentors = await readBlob(BLOB_NAMES.mentors);
  return mentors.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

/**
 * Get mentor by ID
 */
export async function getMentorById(id) {
  const mentors = await readBlob(BLOB_NAMES.mentors);
  return mentors.find(m => m.id === id) || null;
}

/**
 * Create new mentor
 */
export async function createMentor(mentorData) {
  const mentors = await readBlob(BLOB_NAMES.mentors);
  
  if (!mentorData.id) {
    mentorData.id = `M-${Date.now()}`;
  }
  
  mentorData.createdAt = new Date().toISOString();
  mentorData.updatedAt = new Date().toISOString();
  
  mentors.push(mentorData);
  await writeBlob(BLOB_NAMES.mentors, mentors);
  
  return mentorData;
}

/**
 * Update mentor
 */
export async function updateMentor(id, updates) {
  const mentors = await readBlob(BLOB_NAMES.mentors);
  const index = mentors.findIndex(m => m.id === id);
  
  if (index === -1) {
    throw new Error(`Mentor ${id} not found`);
  }
  
  const updated = {
    ...mentors[index],
    ...updates,
    id: mentors[index].id,
    updatedAt: new Date().toISOString(),
  };
  
  mentors[index] = updated;
  await writeBlob(BLOB_NAMES.mentors, mentors);
  
  return updated;
}

/**
 * Delete mentor
 */
export async function deleteMentor(id) {
  const mentors = await readBlob(BLOB_NAMES.mentors);
  const filtered = mentors.filter(m => m.id !== id);
  
  if (filtered.length === mentors.length) {
    throw new Error(`Mentor ${id} not found`);
  }
  
  await writeBlob(BLOB_NAMES.mentors, filtered);
  return { success: true, id };
}

/**
 * Query mentors by subject
 */
export async function getMentorsBySubject(subject) {
  const mentors = await readBlob(BLOB_NAMES.mentors);
  return mentors.filter(m => m.subject === subject).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}
