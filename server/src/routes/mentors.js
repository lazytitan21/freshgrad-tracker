/**
 * Mentors API Routes
 */

import express from 'express';
import * as mentorsService from '../services/mentorsService.js';

const router = express.Router();

// Get all mentors
router.get('/', async (req, res) => {
  try {
    const mentors = await mentorsService.getAllMentors();
    res.json(mentors);
  } catch (error) {
    console.error('GET /mentors error:', error);
    res.status(500).json({ error: 'Failed to fetch mentors' });
  }
});

// Get mentor by ID
router.get('/:id', async (req, res) => {
  try {
    const mentor = await mentorsService.getMentorById(req.params.id);
    if (!mentor) {
      return res.status(404).json({ error: 'Mentor not found' });
    }
    res.json(mentor);
  } catch (error) {
    console.error(`GET /mentors/${req.params.id} error:`, error);
    res.status(500).json({ error: 'Failed to fetch mentor' });
  }
});

// Create new mentor
router.post('/', async (req, res) => {
  try {
    const mentor = await mentorsService.createMentor(req.body);
    res.status(201).json(mentor);
  } catch (error) {
    console.error('POST /mentors error:', error);
    res.status(500).json({ error: 'Failed to create mentor' });
  }
});

// Update mentor
router.put('/:id', async (req, res) => {
  try {
    const mentor = await mentorsService.updateMentor(req.params.id, req.body);
    res.json(mentor);
  } catch (error) {
    console.error(`PUT /mentors/${req.params.id} error:`, error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update mentor' });
  }
});

// Delete mentor
router.delete('/:id', async (req, res) => {
  try {
    const result = await mentorsService.deleteMentor(req.params.id);
    res.json(result);
  } catch (error) {
    console.error(`DELETE /mentors/${req.params.id} error:`, error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete mentor' });
  }
});

// Get mentors by subject
router.get('/subject/:subject', async (req, res) => {
  try {
    const mentors = await mentorsService.getMentorsBySubject(req.params.subject);
    res.json(mentors);
  } catch (error) {
    console.error(`GET /mentors/subject/${req.params.subject} error:`, error);
    res.status(500).json({ error: 'Failed to fetch mentors by subject' });
  }
});

export default router;
