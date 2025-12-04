-- Transactions Table
DROP TABLE IF EXISTS transactions CASCADE;
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID, -- Reference to the uploaded file (if any)
    date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT NOT NULL,
    merchant VARCHAR(255),
    category VARCHAR(100),
    confidence_score DECIMAL(5, 4), -- AI confidence (0.0 to 1.0)
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, flagged, rejected
    
    -- Metadata
    source_system VARCHAR(100), -- e.g., 'plaid', 'quickbooks', 'manual_upload'
    external_id VARCHAR(255), -- ID in the source system
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster filtering
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_category ON transactions(category);
