-- Users Table
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'viewer', -- admin, editor, viewer, auditor
    
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Roles & Permissions (Simple RBAC)
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL, -- e.g., 'transactions', 'settings'
    action VARCHAR(50) NOT NULL, -- e.g., 'read', 'write', 'delete'
    UNIQUE(role, resource, action)
);

-- Seed Initial Admin User (Password: admin123 - needs hashing in real app, using placeholder)
-- In production, use a migration script that hashes the password properly.
INSERT INTO users (username, email, password_hash, role, full_name)
VALUES ('admin', 'admin@example.com', '$2b$10$EpO.5j.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1', 'admin', 'System Administrator')
ON CONFLICT (username) DO NOTHING;

-- Seed Default Permissions
INSERT INTO permissions (role, resource, action) VALUES
('admin', '*', '*'),
('editor', 'transactions', 'read'),
('editor', 'transactions', 'write'),
('viewer', 'transactions', 'read')
ON CONFLICT DO NOTHING;
