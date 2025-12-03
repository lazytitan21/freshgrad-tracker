/**
 * Applicants API Routes
 * Specialized routes for managing teacher applicants
 */

import express from 'express';
import * as applicantsService from '../services/applicantsService.js';

const router = express.Router();

// Get all applicants
router.get('/', async (req, res) => {
  try {
    const applicants = await applicantsService.getAllApplicants();
    res.json(applicants);
  } catch (error) {
    console.error('GET /applicants error:', error);
    res.status(500).json({ error: 'Failed to fetch applicants' });
  }
});

// Get applicant by email
router.get('/:email', async (req, res) => {
  try {
    const applicant = await applicantsService.getApplicantByEmail(req.params.email);
    if (!applicant) {
      return res.status(404).json({ error: 'Applicant not found' });
    }
    res.json(applicant);
  } catch (error) {
    console.error(`GET /applicants/${req.params.email} error:`, error);
    res.status(500).json({ error: 'Failed to fetch applicant' });
  }
});

// Get applicants by status
router.get('/status/:status', async (req, res) => {
  try {
    const applicants = await applicantsService.getApplicantsByStatus(req.params.status);
    res.json(applicants);
  } catch (error) {
    console.error(`GET /applicants/status/${req.params.status} error:`, error);
    res.status(500).json({ error: 'Failed to fetch applicants by status' });
  }
});

// Update applicant status
router.patch('/:email/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const applicant = await applicantsService.updateApplicantStatus(req.params.email, status);
    res.json(applicant);
  } catch (error) {
    console.error(`PATCH /applicants/${req.params.email}/status error:`, error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update applicant status' });
  }
});

// Update applicant documents
router.patch('/:email/docs', async (req, res) => {
  try {
    const applicant = await applicantsService.updateApplicantDocs(req.params.email, req.body);
    res.json(applicant);
  } catch (error) {
    console.error(`PATCH /applicants/${req.params.email}/docs error:`, error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update applicant documents' });
  }
});

// Get interested applicants
router.get('/filter/interested', async (req, res) => {
  try {
    const applicants = await applicantsService.getInterestedApplicants();
    res.json(applicants);
  } catch (error) {
    console.error('GET /applicants/filter/interested error:', error);
    res.status(500).json({ error: 'Failed to fetch interested applicants' });
  }
});

export default router;
