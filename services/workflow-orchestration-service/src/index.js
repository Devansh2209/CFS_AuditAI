const express = require('express');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const db = require('./db');

const app = express();
const port = process.env.PORT || 8008;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'workflow-orchestration-service' });
});

// --- API Endpoints ---

// Get Approval Queue
app.get('/approvals', async (req, res) => {
  try {
    const { status, priority } = req.query;
    let query = `
            SELECT t.*, 
                   (SELECT json_agg(h.*) FROM workflow_history h WHERE h.task_id = t.id) as history
            FROM approval_tasks t
            WHERE 1=1
        `;
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (priority) {
      query += ` AND priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await db.query(query, params);
    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    res.status(500).json({ error: 'Failed to fetch approval tasks' });
  }
});

// Create Approval Task (Internal or via API)
app.post('/approvals', [
  body('transaction_id').isUUID(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { transaction_id, priority = 'medium', comments } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO approval_tasks (transaction_id, priority, comments, status)
             VALUES ($1, $2, $3, 'pending')
             RETURNING *`,
      [transaction_id, priority, comments]
    );

    const task = result.rows[0];

    // Log history
    await db.query(
      `INSERT INTO workflow_history (task_id, action, details)
             VALUES ($1, 'created', $2)`,
      [task.id, JSON.stringify({ comments })]
    );

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create approval task' });
  }
});

// Approve Task
app.post('/approvals/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { user_id, comments } = req.body; // In real app, user_id comes from auth token

  try {
    const result = await db.query(
      `UPDATE approval_tasks 
             SET status = 'approved', resolved_at = NOW() 
             WHERE id = $1 
             RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Log history
    await db.query(
      `INSERT INTO workflow_history (task_id, action, performed_by, details)
             VALUES ($1, 'approved', $2, $3)`,
      [id, user_id, JSON.stringify({ comments })]
    );

    // TODO: Notify other services (e.g., update transaction status in Data Ingestion DB)
    // This would typically be done via an event bus (RabbitMQ/Kafka)

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error approving task:', error);
    res.status(500).json({ error: 'Failed to approve task' });
  }
});

// Reject Task
app.post('/approvals/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { user_id, comments } = req.body;

  try {
    const result = await db.query(
      `UPDATE approval_tasks 
             SET status = 'rejected', resolved_at = NOW() 
             WHERE id = $1 
             RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await db.query(
      `INSERT INTO workflow_history (task_id, action, performed_by, details)
             VALUES ($1, 'rejected', $2, $3)`,
      [id, user_id, JSON.stringify({ comments })]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error rejecting task:', error);
    res.status(500).json({ error: 'Failed to reject task' });
  }
});

app.listen(port, () => {
  console.log(`Workflow Orchestration Service listening on port ${port}`);
});