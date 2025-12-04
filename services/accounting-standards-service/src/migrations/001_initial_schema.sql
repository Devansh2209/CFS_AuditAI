CREATE TABLE IF NOT EXISTS accounting_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_code VARCHAR(20) NOT NULL UNIQUE,
    standard_name VARCHAR(200) NOT NULL,
    description TEXT,
    effective_date DATE,
    version VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(100) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL,
    pattern_value TEXT NOT NULL,
    target_category VARCHAR(50) NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.8,
    standard_id UUID REFERENCES accounting_standards(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
