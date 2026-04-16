-- 1. Add New Columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_name TEXT;

-- 2. Add New Columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS contract_type TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS rejected_by INTEGER REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS resubmitted_from INTEGER;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS second_party_type TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS second_party_email TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS second_party_name TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS second_party_organization TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS external_signature_token TEXT;

-- 3. Create/Update Table: workflows
CREATE TABLE IF NOT EXISTS workflows (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    document_type TEXT NOT NULL,
    contract_type TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS contract_type TEXT;

-- 4. Create/Update Table: workflow_steps
CREATE TABLE IF NOT EXISTS workflow_steps (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id),
    step_order INTEGER NOT NULL,
    role_name TEXT NOT NULL,
    is_external BOOLEAN DEFAULT FALSE
);
ALTER TABLE workflow_steps ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT FALSE;

-- 5. Create New Table: external_signature_invitations
CREATE TABLE IF NOT EXISTS external_signature_invitations (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id),
    invitee_email TEXT NOT NULL,
    invitee_name TEXT,
    invitee_organization TEXT,
    unique_token TEXT UNIQUE NOT NULL,
    token_expires_at TIMESTAMP NOT NULL,
    status TEXT DEFAULT 'pending',
    signed_at TIMESTAMP,
    signer_ip TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Clear and Insert Signature Workflows Data
DELETE FROM workflow_steps;
DELETE FROM workflows;

-- Certificates Workflow
INSERT INTO workflows (name, document_type) VALUES ('مسار الشهادات', 'Certificate');
INSERT INTO workflow_steps (workflow_id, step_order, role_name) SELECT id, 1, 'شؤون الخريجين' FROM workflows WHERE name = 'مسار الشهادات';
INSERT INTO workflow_steps (workflow_id, step_order, role_name) SELECT id, 2, 'مسجل الكلية' FROM workflows WHERE name = 'مسار الشهادات';
INSERT INTO workflow_steps (workflow_id, step_order, role_name) SELECT id, 3, 'عميد الكلية' FROM workflows WHERE name = 'مسار الشهادات';
INSERT INTO workflow_steps (workflow_id, step_order, role_name) SELECT id, 4, 'المسجل العام' FROM workflows WHERE name = 'مسار الشهادات';
INSERT INTO workflow_steps (workflow_id, step_order, role_name) SELECT id, 5, 'رئيس الجامعة' FROM workflows WHERE name = 'مسار الشهادات';

-- Employment Contract Workflow
INSERT INTO workflows (name, document_type, contract_type) VALUES ('عقد توظيف', 'Contract', 'employment');
INSERT INTO workflow_steps (workflow_id, step_order, role_name, is_external) SELECT id, 1, 'مسؤول التوظيف', FALSE FROM workflows WHERE name = 'عقد توظيف';
INSERT INTO workflow_steps (workflow_id, step_order, role_name, is_external) SELECT id, 2, 'ممثل جهة خارجية', TRUE FROM workflows WHERE name = 'عقد توظيف';
INSERT INTO workflow_steps (workflow_id, step_order, role_name, is_external) SELECT id, 3, 'رئيس مجلس الأمناء', FALSE FROM workflows WHERE name = 'عقد توظيف';

-- Purchase Contract Workflow
INSERT INTO workflows (name, document_type, contract_type) VALUES ('عقد شراء', 'Contract', 'purchase');
INSERT INTO workflow_steps (workflow_id, step_order, role_name, is_external) SELECT id, 1, 'الأمين العام', FALSE FROM workflows WHERE name = 'عقد شراء';
INSERT INTO workflow_steps (workflow_id, step_order, role_name, is_external) SELECT id, 2, 'ممثل جهة خارجية', TRUE FROM workflows WHERE name = 'عقد شراء';
INSERT INTO workflow_steps (workflow_id, step_order, role_name, is_external) SELECT id, 3, 'رئيس مجلس الأمناء', FALSE FROM workflows WHERE name = 'عقد شراء';

-- Partnership Contract Workflow
INSERT INTO workflows (name, document_type, contract_type) VALUES ('عقد شراكة', 'Contract', 'partnership');
INSERT INTO workflow_steps (workflow_id, step_order, role_name, is_external) SELECT id, 1, 'رئيس الجامعة', FALSE FROM workflows WHERE name = 'عقد شراكة';
INSERT INTO workflow_steps (workflow_id, step_order, role_name, is_external) SELECT id, 2, 'ممثل جهة خارجية', TRUE FROM workflows WHERE name = 'عقد شراكة';
INSERT INTO workflow_steps (workflow_id, step_order, role_name, is_external) SELECT id, 3, 'رئيس مجلس الأمناء', FALSE FROM workflows WHERE name = 'عقد شراكة';

-- Invoices Workflow
INSERT INTO workflows (name, document_type) VALUES ('مسار الفواتير', 'Invoice');
INSERT INTO workflow_steps (workflow_id, step_order, role_name) SELECT id, 1, 'مقدم طلب الشراء' FROM workflows WHERE name = 'مسار الفواتير';
INSERT INTO workflow_steps (workflow_id, step_order, role_name) SELECT id, 2, 'الأمين العام' FROM workflows WHERE name = 'مسار الفواتير';
INSERT INTO workflow_steps (workflow_id, step_order, role_name) SELECT id, 3, 'المدير المالي' FROM workflows WHERE name = 'مسار الفواتير';
INSERT INTO workflow_steps (workflow_id, step_order, role_name) SELECT id, 4, 'المشتريات' FROM workflows WHERE name = 'مسار الفواتير';
INSERT INTO workflow_steps (workflow_id, step_order, role_name) SELECT id, 5, 'المراجع/الحسابات' FROM workflows WHERE name = 'مسار الفواتير';
