/**
 * Courses Data Access Layer - Azure Blob Storage
 */

import { readBlob, writeBlob, BLOB_NAMES } from '../config/storage.js';

/**
 * Get all courses
 */
export async function getAllCourses() {
  const courses = await readBlob(BLOB_NAMES.courses);
  return courses.filter(c => c.active !== false).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
}

/**
 * Get course by ID
 */
export async function getCourseById(id) {
  const courses = await readBlob(BLOB_NAMES.courses);
  return courses.find(c => c.id === id) || null;
}

/**
 * Get course by code
 */
export async function getCourseByCode(code) {
  const courses = await readBlob(BLOB_NAMES.courses);
  return courses.find(c => c.code === code) || null;
}

/**
 * Create new course
 */
export async function createCourse(courseData) {
  const courses = await readBlob(BLOB_NAMES.courses);
  
  if (!courseData.id) {
    courseData.id = `C-${courseData.code || Date.now()}`;
  }
  
  courseData.createdAt = new Date().toISOString();
  courseData.updatedAt = new Date().toISOString();
  courseData.active = courseData.active !== false; // Default to active
  
  courses.push(courseData);
  await writeBlob(BLOB_NAMES.courses, courses);
  
  return courseData;
}

/**
 * Update course
 */
export async function updateCourse(id, updates) {
  const courses = await readBlob(BLOB_NAMES.courses);
  const index = courses.findIndex(c => c.id === id);
  
  if (index === -1) {
    throw new Error(`Course ${id} not found`);
  }
  
  const updated = {
    ...courses[index],
    ...updates,
    id: courses[index].id,
    updatedAt: new Date().toISOString(),
  };
  
  courses[index] = updated;
  await writeBlob(BLOB_NAMES.courses, courses);
  
  return updated;
}

/**
 * Delete course (soft delete by setting active to false)
 */
export async function deleteCourse(id) {
  const courses = await readBlob(BLOB_NAMES.courses);
  const index = courses.findIndex(c => c.id === id);
  
  if (index === -1) {
    throw new Error(`Course ${id} not found`);
  }
  
  courses[index].active = false;
  courses[index].updatedAt = new Date().toISOString();
  
  await writeBlob(BLOB_NAMES.courses, courses);
  return { success: true, id };
}

/**
 * Get courses by track
 */
export async function getCoursesByTrack(trackId) {
  const courses = await readBlob(BLOB_NAMES.courses);
  return courses.filter(c => c.active !== false && c.tracks && c.tracks.includes(trackId));
}
