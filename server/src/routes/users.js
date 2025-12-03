/**
 * Users API Routes
 */

import express from 'express';
import * as usersService from '../services/usersService.js';

const router = express.Router();

// Authentication endpoint
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const user = await usersService.authenticateUser(email, password);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    console.log('✅ User authenticated:', user.email);
    res.json(user);
  } catch (error) {
    console.error('POST /users/auth/login error:', error);
    if (error.message.includes('Invalid credentials')) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Register new user
router.post('/auth/register', async (req, res) => {
  try {
    const user = await usersService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    console.error('POST /users/auth/register error:', error);
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Get all users (admin only - should add auth middleware)
router.get('/', async (req, res) => {
  try {
    const users = await usersService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('GET /users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by email
router.get('/:email', async (req, res) => {
  try {
    const user = await usersService.getUserByEmail(req.params.email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(`GET /users/${req.params.email} error:`, error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
router.put('/:email', async (req, res) => {
  try {
    const user = await usersService.updateUser(req.params.email, req.body);
    res.json(user);
  } catch (error) {
    console.error(`PUT /users/${req.params.email} error:`, error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:email', async (req, res) => {
  try {
    const result = await usersService.deleteUser(req.params.email);
    res.json(result);
  } catch (error) {
    console.error(`DELETE /users/${req.params.email} error:`, error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get users by role
router.get('/role/:role', async (req, res) => {
  try {
    const users = await usersService.getUsersByRole(req.params.role);
    res.json(users);
  } catch (error) {
    console.error(`GET /users/role/${req.params.role} error:`, error);
    res.status(500).json({ error: 'Failed to fetch users by role' });
  }
});

// Update password
router.post('/:email/password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }
    
    const result = await usersService.updatePassword(req.params.email, newPassword);
    res.json(result);
  } catch (error) {
    console.error(`POST /users/${req.params.email}/password error:`, error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;
