/**
 * Courses API Routes
 */

import express from 'express';
import * as coursesService from '../services/coursesService.js';

const router = express.Router();

// Get all courses
router.get('/', async (req, res) => {
  try {
    const courses = await coursesService.getAllCourses();
    res.json(courses);
  } catch (error) {
    console.error('GET /courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get course by ID
router.get('/:id', async (req, res) => {
  try {
    const course = await coursesService.getCourseById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    console.error(`GET /courses/${req.params.id} error:`, error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Get course by code
router.get('/code/:code', async (req, res) => {
  try {
    const course = await coursesService.getCourseByCode(req.params.code);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    console.error(`GET /courses/code/${req.params.code} error:`, error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Create new course
router.post('/', async (req, res) => {
  try {
    const course = await coursesService.createCourse(req.body);
    res.status(201).json(course);
  } catch (error) {
    console.error('POST /courses error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Update course
router.put('/:id', async (req, res) => {
  try {
    const course = await coursesService.updateCourse(req.params.id, req.body);
    res.json(course);
  } catch (error) {
    console.error(`PUT /courses/${req.params.id} error:`, error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Delete course (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const result = await coursesService.deleteCourse(req.params.id);
    res.json(result);
  } catch (error) {
    console.error(`DELETE /courses/${req.params.id} error:`, error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// Get courses by track
router.get('/track/:trackId', async (req, res) => {
  try {
    const courses = await coursesService.getCoursesByTrack(req.params.trackId);
    res.json(courses);
  } catch (error) {
    console.error(`GET /courses/track/${req.params.trackId} error:`, error);
    res.status(500).json({ error: 'Failed to fetch courses by track' });
  }
});

export default router;
