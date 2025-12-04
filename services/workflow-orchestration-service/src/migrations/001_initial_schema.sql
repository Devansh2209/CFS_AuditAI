-- Approval Tasks Table
DROP TABLE IF EXISTS approval_tasks CASCADE;
DROP TABLE IF EXISTS workflow_history CASCADE;
CREATE TABLE IF NOT EXISTS approval_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL, -- Reference to the transaction (logical FK, separate DB)
    
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, changes_requested
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    
    assigned_to UUID, -- User ID assigned to review
    assigned_group VARCHAR(100), -- Role group (e.g., 'finance_manager')
    
    comments TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Workflow History / Audit Log for Approvals
CREATE TABLE IF NOT EXISTS workflow_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES approval_tasks(id),
    action VARCHAR(50) NOT NULL, -- e.g., 'created', 'assigned', 'approved'
    performed_by UUID, -- User ID
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    details JSONB -- Extra context
);

CREATE INDEX idx_approval_tasks_status ON approval_tasks(status);
CREATE INDEX idx_approval_tasks_assigned_to ON approval_tasks(assigned_to);
