const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('./db');

const app = express();
const port = process.env.PORT || 8010;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123';

app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'security-auth-service' });
});

// --- API Endpoints ---

// Login
app.post('/auth/login', [
  body('username').notEmpty(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Generate Token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.full_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register (Admin only in real app, open for dev)
app.post('/auth/register', [
  body('username').isLength({ min: 3 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, full_name, role = 'viewer' } = req.body;

  try {
    // Check existing
    const existing = await db.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, full_name, role)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, username, email, role, full_name, created_at`,
      [username, email, hash, full_name, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Verify Token / Get Current User
app.get('/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await db.query('SELECT id, username, email, role, full_name FROM users WHERE id = $1', [decoded.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Get All Users (for Security Dashboard)
app.get('/users', async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, email, role, full_name, last_login, is_active FROM users ORDER BY created_at DESC');
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get Roles (Mock for now, or simple distinct query)
app.get('/roles', async (req, res) => {
  try {
    // In a real app, this would query a roles table. For now, return static or distinct roles.
    const result = await db.query('SELECT DISTINCT role FROM users');
    const roles = result.rows.map(r => ({
      id: r.role,
      name: r.role.charAt(0).toUpperCase() + r.role.slice(1),
      description: `Permissions for ${r.role}`,
      userCount: 0 // Calculate if needed
    }));
    res.json({ roles });
  } catch (error) {
    console.error('Fetch roles error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get Sessions (Mock for now)
app.get('/sessions', async (req, res) => {
  try {
    // In a real app, we'd track sessions in a DB table.
    // Returning mock active sessions for the dashboard.
    const result = await db.query('SELECT id, username, last_login FROM users WHERE last_login IS NOT NULL ORDER BY last_login DESC LIMIT 5');
    const sessions = result.rows.map(u => ({
      id: `sess_${u.id}`,
      userId: u.id,
      username: u.username,
      ipAddress: '192.168.1.1', // Mock
      device: 'Chrome / MacOS', // Mock
      lastActive: u.last_login,
      status: 'active'
    }));
    res.json({ sessions });
  } catch (error) {
    console.error('Fetch sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Security Events (Mock for now)
app.get('/security-events', async (req, res) => {
  res.json({ events: [] });
});

app.listen(port, () => {
  console.log(`Security Auth Service listening on port ${port}`);
});