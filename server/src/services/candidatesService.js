/**
 * Candidates Data Access Layer - Azure Blob Storage
 */

import { readBlob, writeBlob, BLOB_NAMES } from '../config/storage.js';

/**
 * Get all candidates
 */
export async function getAllCandidates() {
  return await readBlob(BLOB_NAMES.candidates);
}

/**
 * Get candidate by ID
 */
export async function getCandidateById(id) {
  const candidates = await readBlob(BLOB_NAMES.candidates);
  return candidates.find(c => c.id === id) || null;
}

/**
 * Create new candidate
 */
export async function createCandidate(candidateData) {
  const candidates = await readBlob(BLOB_NAMES.candidates);
  
  // Ensure ID exists
  if (!candidateData.id) {
    candidateData.id = `C-${Date.now()}`;
  }
  
  // Add metadata
  candidateData.createdAt = new Date().toISOString();
  candidateData.updatedAt = new Date().toISOString();
  
  candidates.push(candidateData);
  await writeBlob(BLOB_NAMES.candidates, candidates);
  
  return candidateData;
}

/**
 * Update candidate
 */
export async function updateCandidate(id, updates) {
  const candidates = await readBlob(BLOB_NAMES.candidates);
  const index = candidates.findIndex(c => c.id === id);
  
  if (index === -1) {
    throw new Error(`Candidate ${id} not found`);
  }
  
  const updated = {
    ...candidates[index],
    ...updates,
    id: candidates[index].id, // Preserve ID
    updatedAt: new Date().toISOString(),
  };
  
  candidates[index] = updated;
  await writeBlob(BLOB_NAMES.candidates, candidates);
  
  return updated;
}

/**
 * Delete candidate
 */
export async function deleteCandidate(id) {
  const candidates = await readBlob(BLOB_NAMES.candidates);
  const filtered = candidates.filter(c => c.id !== id);
  
  if (filtered.length === candidates.length) {
    throw new Error(`Candidate ${id} not found`);
  }
  
  await writeBlob(BLOB_NAMES.candidates, filtered);
  return { success: true, id };
}

/**
 * Query candidates by status
 */
export async function getCandidatesByStatus(status) {
  const candidates = await readBlob(BLOB_NAMES.candidates);
  return candidates.filter(c => c.status === status);
}

/**
 * Bulk create candidates (for imports)
 */
export async function bulkCreateCandidates(candidatesArray) {
  const existing = await readBlob(BLOB_NAMES.candidates);
  const results = [];
  const errors = [];
  
  for (const candidate of candidatesArray) {
    try {
      if (!candidate.id) {
        candidate.id = `C-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      }
      candidate.createdAt = new Date().toISOString();
      candidate.updatedAt = new Date().toISOString();
      results.push(candidate);
    } catch (error) {
      errors.push({ candidate, error: error.message });
    }
  }
  
  const updated = [...existing, ...results];
  await writeBlob(BLOB_NAMES.candidates, updated);
  
  return { success: results, errors };
}
