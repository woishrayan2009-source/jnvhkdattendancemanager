-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE staff_role AS ENUM ('ADMIN', 'PRINCIPAL', 'HM', 'GATE_GUARD');
CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'ON_LEAVE');
CREATE TYPE leave_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Create Tables

CREATE TABLE houses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE hostels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE staff (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role staff_role NOT NULL,
    assigned_house_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    house_id UUID REFERENCES houses(id) ON DELETE SET NULL,
    hostel_id UUID REFERENCES hostels(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status attendance_status NOT NULL,
    recorded_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, date)
);

CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status leave_status NOT NULL DEFAULT 'PENDING',
    approved_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    last_sync_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    performed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Setup updated_at triggers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_houses_updated_at BEFORE UPDATE ON houses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_hostels_updated_at BEFORE UPDATE ON hostels FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_attendance_records_updated_at BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leave_requests_updated_at BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sync_log_updated_at BEFORE UPDATE ON sync_log FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_audit_log_updated_at BEFORE UPDATE ON audit_log FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row Level Security
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper Functions for RLS
CREATE OR REPLACE FUNCTION get_user_role() RETURNS staff_role AS $$
    SELECT role FROM staff WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_assigned_houses() RETURNS UUID[] AS $$
    SELECT assigned_house_ids FROM staff WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Admin Policies
CREATE POLICY admin_all_houses ON houses FOR ALL USING (get_user_role() = 'ADMIN');
CREATE POLICY admin_all_hostels ON hostels FOR ALL USING (get_user_role() = 'ADMIN');
CREATE POLICY admin_all_staff ON staff FOR ALL USING (get_user_role() = 'ADMIN');
CREATE POLICY admin_all_students ON students FOR ALL USING (get_user_role() = 'ADMIN');
CREATE POLICY admin_all_attendance ON attendance_records FOR ALL USING (get_user_role() = 'ADMIN');
CREATE POLICY admin_all_leave ON leave_requests FOR ALL USING (get_user_role() = 'ADMIN');
CREATE POLICY admin_all_sync ON sync_log FOR ALL USING (get_user_role() = 'ADMIN');
CREATE POLICY admin_all_audit ON audit_log FOR ALL USING (get_user_role() = 'ADMIN');

-- Principal Policies
CREATE POLICY principal_read_houses ON houses FOR SELECT USING (get_user_role() = 'PRINCIPAL');
CREATE POLICY principal_read_hostels ON hostels FOR SELECT USING (get_user_role() = 'PRINCIPAL');
CREATE POLICY principal_read_staff ON staff FOR SELECT USING (get_user_role() = 'PRINCIPAL');
CREATE POLICY principal_read_students ON students FOR SELECT USING (get_user_role() = 'PRINCIPAL');
CREATE POLICY principal_read_attendance ON attendance_records FOR SELECT USING (get_user_role() = 'PRINCIPAL');
CREATE POLICY principal_read_leave ON leave_requests FOR SELECT USING (get_user_role() = 'PRINCIPAL');
CREATE POLICY principal_read_sync ON sync_log FOR SELECT USING (get_user_role() = 'PRINCIPAL');
CREATE POLICY principal_read_audit ON audit_log FOR SELECT USING (get_user_role() = 'PRINCIPAL');

-- House Master (HM) Policies
-- Read generic lists
CREATE POLICY hm_read_houses ON houses FOR SELECT USING (get_user_role() = 'HM');
CREATE POLICY hm_read_hostels ON hostels FOR SELECT USING (get_user_role() = 'HM');
CREATE POLICY hm_read_staff ON staff FOR SELECT USING (get_user_role() = 'HM');

-- Access their own students
CREATE POLICY hm_students_access ON students FOR ALL USING (
    get_user_role() = 'HM' AND house_id = ANY(get_assigned_houses())
);

-- Access their students' attendance
CREATE POLICY hm_attendance_access ON attendance_records FOR ALL USING (
    get_user_role() = 'HM' AND (SELECT house_id FROM students WHERE id = attendance_records.student_id) = ANY(get_assigned_houses())
);

-- Access their students' leave requests
CREATE POLICY hm_leave_access ON leave_requests FOR ALL USING (
    get_user_role() = 'HM' AND (SELECT house_id FROM students WHERE id = leave_requests.student_id) = ANY(get_assigned_houses())
);

-- Gate Guard Policies
-- Can read approved leaves for today
CREATE POLICY guard_read_leaves ON leave_requests FOR SELECT USING (
    get_user_role() = 'GATE_GUARD' 
    AND status = 'APPROVED' 
    AND CURRENT_DATE >= start_date 
    AND CURRENT_DATE <= end_date
);

-- Can read students that have an active approved leave for today
CREATE POLICY guard_read_students ON students FOR SELECT USING (
    get_user_role() = 'GATE_GUARD'
    AND id IN (
        SELECT student_id FROM leave_requests 
        WHERE status = 'APPROVED' 
        AND CURRENT_DATE >= start_date 
        AND CURRENT_DATE <= end_date
    )
);

-- Staff self-read policy (so users can query their own profile)
CREATE POLICY staff_read_self ON staff FOR SELECT USING (id = auth.uid());


-- ==============================================================================
-- SEED DATA
-- ==============================================================================

-- Houses
INSERT INTO houses (id, name) VALUES
('11111111-1111-4111-8111-111111111111', 'Aravali'),
('22222222-2222-4222-8222-222222222222', 'Nilgiri'),
('33333333-3333-4333-8333-333333333333', 'Shivalik'),
('44444444-4444-4444-8444-444444444444', 'Udaigiri')
ON CONFLICT (id) DO NOTHING;

-- Hostels
INSERT INTO hostels (id, name) VALUES
('55555555-5555-4555-8555-555555555555', 'Boys Hostel A'),
('66666666-6666-4666-8666-666666666666', 'Girls Hostel A')
ON CONFLICT (id) DO NOTHING;

-- Since staff requires auth.users, we insert into auth.users first.
-- In a real Supabase instance, this schema is protected, but accessible during initial migrations/seeds.
INSERT INTO auth.users (id, email) VALUES
('77777777-7777-4777-8777-777777777777', 'principal@jnv.edu'),
('88888888-8888-4888-8888-888888888888', 'hm.aravali@jnv.edu'),
('99999999-9999-4999-8999-999999999999', 'guard@jnv.edu')
ON CONFLICT (id) DO NOTHING;

-- Staff
INSERT INTO staff (id, name, role, assigned_house_ids) VALUES
('77777777-7777-4777-8777-777777777777', 'Dr. Sharma', 'PRINCIPAL', '{}'),
('88888888-8888-4888-8888-888888888888', 'Mr. Verma', 'HM', '{"11111111-1111-4111-8111-111111111111"}'),
('99999999-9999-4999-8999-999999999999', 'Ramu Kaka', 'GATE_GUARD', '{}')
ON CONFLICT (id) DO NOTHING;

-- Students (10)
INSERT INTO students (id, name, house_id, hostel_id) VALUES
(uuid_generate_v4(), 'Rahul Kumar', '11111111-1111-4111-8111-111111111111', '55555555-5555-4555-8555-555555555555'),
(uuid_generate_v4(), 'Amit Singh', '11111111-1111-4111-8111-111111111111', '55555555-5555-4555-8555-555555555555'),
(uuid_generate_v4(), 'Priya Sharma', '22222222-2222-4222-8222-222222222222', '66666666-6666-4666-8666-666666666666'),
(uuid_generate_v4(), 'Neha Gupta', '22222222-2222-4222-8222-222222222222', '66666666-6666-4666-8666-666666666666'),
(uuid_generate_v4(), 'Vikas Yadav', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555555'),
(uuid_generate_v4(), 'Arun Patel', '33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555555'),
(uuid_generate_v4(), 'Anjali Desai', '44444444-4444-4444-8444-444444444444', '66666666-6666-4666-8666-666666666666'),
(uuid_generate_v4(), 'Sneha Joshi', '44444444-4444-4444-8444-444444444444', '66666666-6666-4666-8666-666666666666'),
(uuid_generate_v4(), 'Karan Malhotra', '11111111-1111-4111-8111-111111111111', '55555555-5555-4555-8555-555555555555'),
(uuid_generate_v4(), 'Suresh Reddy', '22222222-2222-4222-8222-222222222222', '55555555-5555-4555-8555-555555555555');
