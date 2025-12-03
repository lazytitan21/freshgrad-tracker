/**
 * Candidates API Routes
 */

import express from 'express';
import * as candidatesService from '../services/candidatesService.js';

const router = express.Router();

// Get all candidates
router.get('/', async (req, res) => {
  try {
    const candidates = await candidatesService.getAllCandidates();
    res.json(candidates);
  } catch (error) {
    console.error('GET /candidates error:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// Get candidate by ID
router.get('/:id', async (req, res) => {
  try {
    const candidate = await candidatesService.getCandidateById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.json(candidate);
  } catch (error) {
    console.error(`GET /candidates/${req.params.id} error:`, error);
    res.status(500).json({ error: 'Failed to fetch candidate' });
  }
});

// Create new candidate
router.post('/', async (req, res) => {
  try {
    const candidate = await candidatesService.createCandidate(req.body);
    res.status(201).json(candidate);
  } catch (error) {
    console.error('POST /candidates error:', error);
    res.status(500).json({ error: 'Failed to create candidate' });
  }
});

// Update candidate
router.put('/:id', async (req, res) => {
  try {
    const candidate = await candidatesService.updateCandidate(req.params.id, req.body);
    res.json(candidate);
  } catch (error) {
    console.error(`PUT /candidates/${req.params.id} error:`, error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

// Delete candidate
router.delete('/:id', async (req, res) => {
  try {
    const result = await candidatesService.deleteCandidate(req.params.id);
    res.json(result);
  } catch (error) {
    console.error(`DELETE /candidates/${req.params.id} error:`, error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});

// Get candidates by status
router.get('/status/:status', async (req, res) => {
  try {
    const candidates = await candidatesService.getCandidatesByStatus(req.params.status);
    res.json(candidates);
  } catch (error) {
    console.error(`GET /candidates/status/${req.params.status} error:`, error);
    res.status(500).json({ error: 'Failed to fetch candidates by status' });
  }
});

// Bulk create candidates (for imports)
router.post('/bulk', async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Request body must be an array' });
    }
    
    const result = await candidatesService.bulkCreateCandidates(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('POST /candidates/bulk error:', error);
    res.status(500).json({ error: 'Failed to bulk create candidates' });
  }
});

export default router;
