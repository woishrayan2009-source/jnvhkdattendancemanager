-- ══════════════════════════════════════════════════════════════════════════════
-- JNV Hostel Manager — Initial Schema & RLS
-- Migration : 001_initial.sql
-- Database  : Supabase (PostgreSQL 15+)
-- Run in    : Supabase Dashboard → SQL Editor  OR  supabase db push
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── 0. Extensions ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── 1. Custom Enum Types ─────────────────────────────────────────────────────

CREATE TYPE staff_role AS ENUM (
  'principal',
  'vice_principal',
  'house_master',
  'associate_hm',
  'warden',
  'gate_guard',
  'admin'
);

CREATE TYPE student_gender AS ENUM ('male', 'female');

CREATE TYPE session_type AS ENUM ('morning', 'evening', 'night');

CREATE TYPE attendance_status AS ENUM (
  'present',    -- ✓ physically present
  'absent',     -- ✗ not present, not accounted for
  'leave',      -- approved leave (HL/ML/CL/OD)
  'sickbay',    -- admitted to school sick bay
  'duty'        -- official duty / inter-school event
);

CREATE TYPE leave_type AS ENUM (
  'home_leave',     -- HL: standard home visit
  'medical_leave',  -- ML: illness / hospitalisation
  'casual_leave',   -- CL: short personal reason
  'official_duty'   -- OD: NVS / competition duty
);

CREATE TYPE leave_status AS ENUM (
  'pending',             -- submitted, awaiting HM review
  'approved_hm',         -- HM approved (short leaves ≤ 3 days)
  'approved_principal',  -- Principal approved (long / medical)
  'rejected',            -- rejected with remarks
  'cancelled'            -- withdrawn by HM / admin
);

CREATE TYPE dml_operation AS ENUM ('insert', 'update', 'delete');

-- ─── 2. Shared trigger: auto-update updated_at ────────────────────────────────

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── 3. RLS helper functions ──────────────────────────────────────────────────
-- Called inside USING / WITH CHECK clauses.
-- SECURITY DEFINER so they can read the staff table even inside RLS.

-- Returns the calling user's role (NULL if not in staff table)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS staff_role LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.staff WHERE id = auth.uid();
$$;

-- Returns the calling user's assigned house IDs (empty array if none / not found)
CREATE OR REPLACE FUNCTION get_my_house_ids()
RETURNS uuid[] LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(assigned_house_ids, ARRAY[]::uuid[])
  FROM public.staff
  WHERE id = auth.uid();
$$;

-- Returns TRUE for roles with school-wide authority
CREATE OR REPLACE FUNCTION is_school_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE id = auth.uid()
      AND role IN ('principal', 'vice_principal', 'admin')
  );
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: houses
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.houses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  color_hex   TEXT        NOT NULL,           -- e.g. '#16a34a'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.houses
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;

-- Every authenticated user may read house metadata (needed for dashboards)
CREATE POLICY "houses: authenticated can read"
  ON public.houses FOR SELECT TO authenticated USING (true);

-- Only school-admin roles may create / modify / delete houses
CREATE POLICY "houses: admin full access"
  ON public.houses FOR ALL TO authenticated
  USING (is_school_admin())
  WITH CHECK (is_school_admin());

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: hostels
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.hostels (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT          NOT NULL,
  -- 'sub_junior' | 'girls' | 'junior' | 'senior'
  section      TEXT          NOT NULL,
  -- Which houses live in this hostel (array of house.id)
  house_ids    UUID[]        NOT NULL DEFAULT '{}',
  -- PostgreSQL inclusive integer range: '[7,9]' means class 7, 8, 9
  class_range  INT4RANGE     NOT NULL,
  gender       student_gender NOT NULL,
  capacity     SMALLINT      NOT NULL DEFAULT 60,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.hostels
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hostels: authenticated can read"
  ON public.hostels FOR SELECT TO authenticated USING (true);

CREATE POLICY "hostels: admin full access"
  ON public.hostels FOR ALL TO authenticated
  USING (is_school_admin())
  WITH CHECK (is_school_admin());

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: staff
-- staff.id = auth.uid() — the primary link to Supabase Auth
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.staff (
  id                  UUID        PRIMARY KEY
                                    REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT        NOT NULL UNIQUE,
  full_name           TEXT        NOT NULL,
  role                staff_role  NOT NULL,
  -- NULL  = school-wide access (Principal, VP, Admin)
  -- Array = specific house UUIDs the staff member is responsible for
  assigned_house_ids  UUID[]      DEFAULT NULL,
  phone               TEXT,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  academic_year       TEXT        NOT NULL DEFAULT '2025-26',
  pin_hash            TEXT,       -- bcrypt hash of 4-digit PIN for offline unlock
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_role       ON public.staff(role);
CREATE INDEX idx_staff_email      ON public.staff(email);
CREATE INDEX idx_staff_is_active  ON public.staff(is_active);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Every authenticated user can read their own row (needed on login)
CREATE POLICY "staff: read own row"
  ON public.staff FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Principal / Admin can read all staff records
CREATE POLICY "staff: admin reads all"
  ON public.staff FOR SELECT TO authenticated
  USING (is_school_admin());

-- Only Principal / Admin can create, modify, delete staff
CREATE POLICY "staff: admin full write"
  ON public.staff FOR ALL TO authenticated
  USING (is_school_admin())
  WITH CHECK (is_school_admin());

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: students
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.students (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_no     TEXT          NOT NULL UNIQUE,
  roll_no          TEXT          NOT NULL,
  full_name        TEXT          NOT NULL,
  class_no         SMALLINT      NOT NULL CHECK (class_no BETWEEN 6 AND 12),
  -- Class 6-10 → 'A' | 'B';   Class 11-12 → 'Science' | 'Commerce'
  section          TEXT          NOT NULL,
  house_id         UUID          NOT NULL REFERENCES public.houses(id),
  hostel_id        UUID          NOT NULL REFERENCES public.hostels(id),
  gender           student_gender NOT NULL,
  room_no          TEXT,
  bed_no           TEXT,
  father_name      TEXT          NOT NULL,
  mother_name      TEXT          NOT NULL,
  guardian_phone   TEXT          NOT NULL,
  guardian_phone2  TEXT,
  blood_group      TEXT,
  medical_notes    TEXT,
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  academic_year    TEXT          NOT NULL DEFAULT '2025-26',
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_students_house        ON public.students(house_id);
CREATE INDEX idx_students_hostel       ON public.students(hostel_id);
CREATE INDEX idx_students_class        ON public.students(class_no, section);
CREATE INDEX idx_students_active       ON public.students(is_active) WHERE is_active;
CREATE INDEX idx_students_admission    ON public.students(admission_no);
CREATE INDEX idx_students_year         ON public.students(academic_year);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Principal / VP / Admin: unrestricted access to all students
CREATE POLICY "students: admin full access"
  ON public.students FOR ALL TO authenticated
  USING (is_school_admin())
  WITH CHECK (is_school_admin());

-- House Master, Associate HM, Warden: read students in their house(s)
CREATE POLICY "students: hm reads own house"
  ON public.students FOR SELECT TO authenticated
  USING (
    get_my_role() IN ('house_master', 'associate_hm', 'warden')
    AND house_id = ANY(get_my_house_ids())
  );

-- House Master / Associate HM: add students to their house
CREATE POLICY "students: hm inserts own house"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() IN ('house_master', 'associate_hm')
    AND house_id = ANY(get_my_house_ids())
  );

-- House Master / Associate HM: update students in their house
CREATE POLICY "students: hm updates own house"
  ON public.students FOR UPDATE TO authenticated
  USING (
    get_my_role() IN ('house_master', 'associate_hm')
    AND house_id = ANY(get_my_house_ids())
  )
  WITH CHECK (
    get_my_role() IN ('house_master', 'associate_hm')
    AND house_id = ANY(get_my_house_ids())
  );

-- Gate Guard: no access to student records

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: attendance_records
-- One row per (student, date, session). Unique constraint enforces this.
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.attendance_records (
  id             UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID              NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date           DATE              NOT NULL,
  session        session_type      NOT NULL,
  status         attendance_status NOT NULL DEFAULT 'present',
  remarks        TEXT,
  marked_by      UUID              NOT NULL REFERENCES public.staff(id),
  marked_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  -- After midnight only Principal/VP can flip is_finalized = FALSE to amend
  is_finalized   BOOLEAN           NOT NULL DEFAULT FALSE,
  -- Device that wrote this record (for conflict resolution in sync)
  device_id      TEXT,
  role_at_write  staff_role,       -- captures role at time of write for conflict resolution
  created_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  -- Enforce one record per student per session per day
  UNIQUE (student_id, date, session)
);

CREATE INDEX idx_att_date            ON public.attendance_records(date);
CREATE INDEX idx_att_date_session    ON public.attendance_records(date, session);
CREATE INDEX idx_att_student_date    ON public.attendance_records(student_id, date);
CREATE INDEX idx_att_status          ON public.attendance_records(status);
CREATE INDEX idx_att_finalized       ON public.attendance_records(is_finalized) WHERE NOT is_finalized;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Principal / VP / Admin: full access (can also un-finalize)
CREATE POLICY "att: admin full access"
  ON public.attendance_records FOR ALL TO authenticated
  USING (is_school_admin())
  WITH CHECK (is_school_admin());

-- HM / AssocHM / Warden: read attendance for students in their house
CREATE POLICY "att: hm reads own house"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (
    get_my_role() IN ('house_master', 'associate_hm', 'warden')
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND s.house_id = ANY(get_my_house_ids())
    )
  );

-- HM / AssocHM / Warden: mark attendance for their house
CREATE POLICY "att: hm inserts own house"
  ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() IN ('house_master', 'associate_hm', 'warden')
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND s.house_id = ANY(get_my_house_ids())
    )
  );

-- HM / AssocHM / Warden: amend non-finalized records for their house
CREATE POLICY "att: hm updates non-finalized own house"
  ON public.attendance_records FOR UPDATE TO authenticated
  USING (
    get_my_role() IN ('house_master', 'associate_hm', 'warden')
    AND NOT is_finalized
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND s.house_id = ANY(get_my_house_ids())
    )
  )
  WITH CHECK (
    get_my_role() IN ('house_master', 'associate_hm', 'warden')
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND s.house_id = ANY(get_my_house_ids())
    )
  );

-- Gate Guard: read today's attendance only (for gate verification)
CREATE POLICY "att: guard reads today"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (
    get_my_role() = 'gate_guard'
    AND date = CURRENT_DATE
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: leave_requests
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.leave_requests (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID         NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  leave_type        leave_type   NOT NULL,
  from_date         DATE         NOT NULL,
  to_date           DATE         NOT NULL,
  -- expected_return may differ from to_date (travel days, etc.)
  expected_return   DATE         NOT NULL,
  reason            TEXT         NOT NULL,
  guardian_contact  TEXT         NOT NULL,
  status            leave_status NOT NULL DEFAULT 'pending',
  applied_by        UUID         NOT NULL REFERENCES public.staff(id),
  reviewed_by       UUID         REFERENCES public.staff(id),
  review_remarks    TEXT,
  -- Set by Gate Guard when student physically checks back in
  returned_at       TIMESTAMPTZ,
  -- Auto-set by trigger: TRUE if expected_return < today and not yet returned
  is_overdue        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT leave_dates_valid  CHECK (from_date <= to_date),
  CONSTRAINT leave_return_valid CHECK (to_date <= expected_return)
);

CREATE INDEX idx_leave_student   ON public.leave_requests(student_id);
CREATE INDEX idx_leave_status    ON public.leave_requests(status);
CREATE INDEX idx_leave_from_date ON public.leave_requests(from_date);
CREATE INDEX idx_leave_overdue   ON public.leave_requests(is_overdue) WHERE is_overdue;
CREATE INDEX idx_leave_active    ON public.leave_requests(from_date, to_date)
  WHERE status IN ('approved_hm', 'approved_principal');

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Auto-compute is_overdue before every save
CREATE OR REPLACE FUNCTION fn_compute_overdue()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.is_overdue := (
    NEW.expected_return < CURRENT_DATE
    AND NEW.returned_at IS NULL
    AND NEW.status IN ('approved_hm', 'approved_principal')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compute_overdue
  BEFORE INSERT OR UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION fn_compute_overdue();

-- Prevent overlapping approved leaves for same student
CREATE OR REPLACE FUNCTION fn_check_no_overlap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.leave_requests
    WHERE student_id = NEW.student_id
      AND id         != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status     IN ('approved_hm', 'approved_principal')
      AND daterange(from_date, to_date, '[]') &&
          daterange(NEW.from_date, NEW.to_date, '[]')
  ) THEN
    RAISE EXCEPTION
      'Student % already has an approved leave overlapping [% – %]',
      NEW.student_id, NEW.from_date, NEW.to_date;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_no_overlap
  BEFORE INSERT OR UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION fn_check_no_overlap();

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Principal / VP / Admin: full access
CREATE POLICY "leaves: admin full access"
  ON public.leave_requests FOR ALL TO authenticated
  USING (is_school_admin())
  WITH CHECK (is_school_admin());

-- HM / Associate HM: read leaves for their house
CREATE POLICY "leaves: hm reads own house"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (
    get_my_role() IN ('house_master', 'associate_hm')
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND s.house_id = ANY(get_my_house_ids())
    )
  );

-- HM / Associate HM: submit leave requests for their house
CREATE POLICY "leaves: hm submits own house"
  ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() IN ('house_master', 'associate_hm')
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND s.house_id = ANY(get_my_house_ids())
    )
  );

-- HM / Associate HM: update / approve leaves for their house
CREATE POLICY "leaves: hm updates own house"
  ON public.leave_requests FOR UPDATE TO authenticated
  USING (
    get_my_role() IN ('house_master', 'associate_hm')
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND s.house_id = ANY(get_my_house_ids())
    )
  )
  WITH CHECK (
    get_my_role() IN ('house_master', 'associate_hm')
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id
        AND s.house_id = ANY(get_my_house_ids())
    )
  );

-- Gate Guard: read today's active approved leaves (for gate verification)
CREATE POLICY "leaves: guard reads today approved"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (
    get_my_role() = 'gate_guard'
    AND status IN ('approved_hm', 'approved_principal')
    AND from_date <= CURRENT_DATE
    AND to_date   >= CURRENT_DATE
  );

-- Gate Guard: mark a student as returned (sets returned_at only)
CREATE POLICY "leaves: guard marks returned"
  ON public.leave_requests FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'gate_guard'
    AND status IN ('approved_hm', 'approved_principal')
    AND returned_at IS NULL
    AND from_date <= CURRENT_DATE
    AND to_date   >= CURRENT_DATE
  )
  WITH CHECK (
    get_my_role() = 'gate_guard'
    -- Guard may only set returned_at; cannot change status / dates
    AND status IN ('approved_hm', 'approved_principal')
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: sync_log
-- Written by each device when it pushes an offline change to Supabase.
-- Used by the SyncService conflict resolver (Phase 3).
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.sync_log (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id       UUID          NOT NULL REFERENCES public.staff(id),
  device_id      TEXT          NOT NULL,
  table_name     TEXT          NOT NULL,
  record_id      UUID          NOT NULL,
  operation      dml_operation NOT NULL,
  payload        JSONB         NOT NULL DEFAULT '{}',
  -- Captured at write time for conflict resolution:
  -- If two devices edit same record offline, Principal role wins;
  -- otherwise latest synced_at wins.
  role_at_write  staff_role    NOT NULL,
  synced_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  retry_count    SMALLINT      NOT NULL DEFAULT 0,
  last_error     TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_staff       ON public.sync_log(staff_id);
CREATE INDEX idx_sync_record      ON public.sync_log(table_name, record_id);
CREATE INDEX idx_sync_synced_at   ON public.sync_log(synced_at);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.sync_log
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

-- Staff can push their own sync records
CREATE POLICY "sync: own insert"
  ON public.sync_log FOR INSERT TO authenticated
  WITH CHECK (staff_id = auth.uid());

-- Staff can read their own sync records (to check pending / errors)
CREATE POLICY "sync: own select"
  ON public.sync_log FOR SELECT TO authenticated
  USING (staff_id = auth.uid());

-- Admin can read all sync logs (for debugging)
CREATE POLICY "sync: admin reads all"
  ON public.sync_log FOR SELECT TO authenticated
  USING (is_school_admin());

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: audit_log
-- Append-only. Populated exclusively by AFTER triggers (SECURITY DEFINER).
-- Nobody may INSERT directly; SELECT is restricted to Principal/Admin.
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE public.audit_log (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name     TEXT          NOT NULL,
  record_id      UUID          NOT NULL,
  operation      dml_operation NOT NULL,
  before_value   JSONB,        -- NULL for INSERTs
  after_value    JSONB         NOT NULL,
  performed_by   UUID          REFERENCES public.staff(id),
  -- Device ID passed via SET LOCAL app.device_id = '...' before each write
  device_id      TEXT          NOT NULL DEFAULT 'server',
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  -- audit_log is intentionally immutable — no updated_at / UPDATE allowed
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX idx_audit_performer    ON public.audit_log(performed_by);
CREATE INDEX idx_audit_created      ON public.audit_log(created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- No one can INSERT into audit_log directly (only via the trigger function below)
-- The trigger function runs as SECURITY DEFINER and bypasses RLS

-- Only Principal / Admin can read the audit trail
CREATE POLICY "audit: admin reads all"
  ON public.audit_log FOR SELECT TO authenticated
  USING (is_school_admin());

-- ─── Audit trigger ────────────────────────────────────────────────────────────
-- Captures every INSERT / UPDATE / DELETE on key tables.
-- Reads device_id from the local session variable app.device_id (set by client).
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_record_id   UUID;
  v_before      JSONB;
  v_after       JSONB;
  v_device      TEXT;
BEGIN
  v_device  := COALESCE(current_setting('app.device_id', true), 'server');

  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
    v_before    := to_jsonb(OLD);
    v_after     := to_jsonb(OLD);   -- store old as after for DELETE audit
  ELSIF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id;
    v_before    := NULL;
    v_after     := to_jsonb(NEW);
  ELSE  -- UPDATE
    v_record_id := NEW.id;
    v_before    := to_jsonb(OLD);
    v_after     := to_jsonb(NEW);
  END IF;

  INSERT INTO public.audit_log (
    table_name, record_id, operation,
    before_value, after_value,
    performed_by, device_id
  ) VALUES (
    TG_TABLE_NAME,
    v_record_id,
    LOWER(TG_OP)::dml_operation,
    v_before, v_after,
    auth.uid(),
    v_device
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- Attach audit trigger to the three most important tables
CREATE TRIGGER audit_students
  AFTER INSERT OR UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER audit_attendance
  AFTER INSERT OR UPDATE OR DELETE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER audit_leave_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- ─── Auth hook: link auth.users → staff on first sign-up ─────────────────────
-- When an auth user is created whose email matches a pre-seeded staff row,
-- the staff.id is updated to match auth.uid() so RLS resolves correctly.
-- In practice: Admin seeds staff by email → creates Supabase auth user with same email.
CREATE OR REPLACE FUNCTION fn_handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- If a staff row with this email already exists (seeded by admin), adopt the auth UUID
  UPDATE public.staff
  SET id = NEW.id
  WHERE email = NEW.email
    AND id    != NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_auth_user();

-- ══════════════════════════════════════════════════════════════════════════════
-- VIEWS
-- ══════════════════════════════════════════════════════════════════════════════

-- Today's session summary per house
CREATE OR REPLACE VIEW public.v_today_summary AS
SELECT
  h.id                                                  AS house_id,
  h.name                                                AS house_name,
  ar.session,
  COUNT(*)                                              AS total_marked,
  COUNT(*) FILTER (WHERE ar.status = 'present')         AS present_count,
  COUNT(*) FILTER (WHERE ar.status = 'absent')          AS absent_count,
  COUNT(*) FILTER (WHERE ar.status = 'leave')           AS on_leave_count,
  COUNT(*) FILTER (WHERE ar.status = 'sickbay')         AS sickbay_count,
  COUNT(*) FILTER (WHERE ar.status = 'duty')            AS duty_count,
  BOOL_AND(ar.is_finalized)                             AS session_finalized
FROM public.attendance_records ar
JOIN public.students s ON s.id = ar.student_id
JOIN public.houses   h ON h.id = s.house_id
WHERE ar.date = CURRENT_DATE
GROUP BY h.id, h.name, ar.session;

-- Students currently on approved leave today
CREATE OR REPLACE VIEW public.v_students_on_leave_today AS
SELECT
  lr.id              AS leave_id,
  s.id               AS student_id,
  s.full_name,
  s.class_no,
  s.section,
  h.name             AS house_name,
  lr.leave_type,
  lr.from_date,
  lr.to_date,
  lr.expected_return,
  lr.returned_at,
  lr.is_overdue,
  lr.guardian_contact
FROM public.leave_requests lr
JOIN public.students s ON s.id = lr.student_id
JOIN public.houses   h ON h.id = s.house_id
WHERE lr.status IN ('approved_hm', 'approved_principal')
  AND lr.from_date <= CURRENT_DATE
  AND lr.to_date   >= CURRENT_DATE;

-- Hostel effective strength:
-- Effective Strength = Total Enrolled − On Approved Leave (today)
CREATE OR REPLACE VIEW public.v_hostel_strength AS
SELECT
  h.id                                                             AS house_id,
  h.name                                                           AS house_name,
  COUNT(DISTINCT s.id)                                             AS total_enrolled,
  COUNT(DISTINCT ol.student_id)                                    AS on_leave_today,
  COUNT(DISTINCT s.id) - COUNT(DISTINCT ol.student_id)            AS effective_strength
FROM public.houses h
LEFT JOIN public.students s
  ON s.house_id = h.id AND s.is_active = TRUE
LEFT JOIN (
  SELECT DISTINCT student_id
  FROM public.leave_requests
  WHERE status IN ('approved_hm', 'approved_principal')
    AND from_date <= CURRENT_DATE
    AND to_date   >= CURRENT_DATE
) ol ON ol.student_id = s.id
GROUP BY h.id, h.name
ORDER BY h.name;

-- ══════════════════════════════════════════════════════════════════════════════
-- SEED DATA
-- Run after migration to get a working dev environment.
-- Staff UUIDs are placeholders — replace with actual Supabase Auth UIDs
-- when creating auth users, OR let the fn_handle_new_auth_user trigger
-- auto-link on first login.
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  -- ── Fixed house UUIDs ──────────────────────────────
  v_nilgiri   UUID := 'a0000001-0000-0000-0000-000000000001';
  v_aravali   UUID := 'a0000001-0000-0000-0000-000000000002';
  v_shivalik  UUID := 'a0000001-0000-0000-0000-000000000003';
  v_udaygiri  UUID := 'a0000001-0000-0000-0000-000000000004';

  -- ── Fixed hostel UUIDs ─────────────────────────────
  v_jb1       UUID := 'b0000002-0000-0000-0000-000000000001'; -- Junior Boys H1
  v_sb_nil    UUID := 'b0000002-0000-0000-0000-000000000002'; -- Senior Boys Nilgiri

  -- ── Placeholder staff UUIDs (must match auth.users.id after setup) ─────
  v_principal UUID := 'c0000003-0000-0000-0000-000000000001';
  v_hm_nil    UUID := 'c0000003-0000-0000-0000-000000000002';
  v_guard     UUID := 'c0000003-0000-0000-0000-000000000003';

BEGIN

  -- ── Houses ──────────────────────────────────────────────────────────────
  INSERT INTO public.houses (id, name, color_hex) VALUES
    (v_nilgiri,  'Nilgiri',  '#16a34a'),
    (v_aravali,  'Aravali',  '#2563eb'),
    (v_shivalik, 'Shivalik', '#d97706'),
    (v_udaygiri, 'Udaygiri', '#dc2626')
  ON CONFLICT (id) DO NOTHING;

  -- ── Hostels ─────────────────────────────────────────────────────────────
  INSERT INTO public.hostels (id, name, section, house_ids, class_range, gender, capacity) VALUES
    (v_jb1,
     'Junior Boys Hostel-1',
     'junior',
     ARRAY[v_nilgiri, v_aravali],
     '[7,9]'::int4range,
     'male',
     80),
    (v_sb_nil,
     'Senior Boys Hostel – Nilgiri',
     'senior',
     ARRAY[v_nilgiri],
     '[10,12]'::int4range,
     'male',
     60)
  ON CONFLICT (id) DO NOTHING;

  -- ── Staff (placeholder UUIDs — link to auth users after Supabase Auth setup)
  -- To activate: In Supabase Dashboard → Auth → Users → "Add user" with these emails.
  -- The fn_handle_new_auth_user trigger will auto-update staff.id to match auth.uid().
  INSERT INTO public.staff (id, email, full_name, role, assigned_house_ids) VALUES
    (v_principal,
     'principal@jnvharidwar.in',
     'Dr. Rajesh Kumar',
     'principal',
     NULL),                          -- NULL = full school access

    (v_hm_nil,
     'hm.nilgiri@jnvharidwar.in',
     'Suresh Singh',
     'house_master',
     ARRAY[v_nilgiri]),              -- Nilgiri house only

    (v_guard,
     'guard@jnvharidwar.in',
     'Ramesh Yadav',
     'gate_guard',
     NULL)                           -- Gate guard sees school-wide approved leaves
  ON CONFLICT (id) DO NOTHING;

  -- ── Students (10 sample records) ────────────────────────────────────────
  INSERT INTO public.students (
    id, admission_no, roll_no, full_name,
    class_no, section, house_id, hostel_id, gender, room_no,
    father_name, mother_name, guardian_phone
  ) VALUES
    ('d0000004-0000-0000-0000-000000000001',
     'JNV/HKD/2025/001', '7-A-001', 'Arjun Sharma',
     7, 'A', v_nilgiri, v_jb1, 'male', 'J1-101',
     'Ramesh Sharma', 'Sunita Sharma', '9876543201'),

    ('d0000004-0000-0000-0000-000000000002',
     'JNV/HKD/2025/002', '7-A-002', 'Vikram Singh',
     7, 'A', v_nilgiri, v_jb1, 'male', 'J1-101',
     'Harpal Singh', 'Meena Singh', '9876543202'),

    ('d0000004-0000-0000-0000-000000000003',
     'JNV/HKD/2025/003', '7-B-001', 'Priya Sharma',
     7, 'B', v_aravali, v_jb1, 'male', 'J1-102',
     'Girish Sharma', 'Lata Sharma', '9876543203'),

    ('d0000004-0000-0000-0000-000000000004',
     'JNV/HKD/2025/004', '8-A-001', 'Rahul Meena',
     8, 'A', v_aravali, v_jb1, 'male', 'J1-201',
     'Suresh Meena', 'Gita Meena', '9876543204'),

    ('d0000004-0000-0000-0000-000000000005',
     'JNV/HKD/2025/005', '9-A-001', 'Sanjay Yadav',
     9, 'A', v_nilgiri, v_jb1, 'male', 'J1-301',
     'Mohan Yadav', 'Kavita Yadav', '9876543205'),

    ('d0000004-0000-0000-0000-000000000006',
     'JNV/HKD/2025/006', '9-B-001', 'Deepak Kumar',
     9, 'B', v_nilgiri, v_jb1, 'male', 'J1-302',
     'Anil Kumar', 'Rekha Kumar', '9876543206'),

    ('d0000004-0000-0000-0000-000000000007',
     'JNV/HKD/2025/007', '10-A-001', 'Ravi Joshi',
     10, 'A', v_nilgiri, v_sb_nil, 'male', 'S1-101',
     'Vikas Joshi', 'Asha Joshi', '9876543207'),

    ('d0000004-0000-0000-0000-000000000008',
     'JNV/HKD/2025/008', '11-Sci-001', 'Rohit Patel',
     11, 'Science', v_nilgiri, v_sb_nil, 'male', 'S1-201',
     'Kiran Patel', 'Mala Patel', '9876543208'),

    ('d0000004-0000-0000-0000-000000000009',
     'JNV/HKD/2025/009', '11-Com-001', 'Sunil Negi',
     11, 'Commerce', v_nilgiri, v_sb_nil, 'male', 'S1-202',
     'Bhanu Negi', 'Geeta Negi', '9876543209'),

    ('d0000004-0000-0000-0000-000000000010',
     'JNV/HKD/2025/010', '12-Sci-001', 'Amit Rawat',
     12, 'Science', v_nilgiri, v_sb_nil, 'male', 'S1-301',
     'Gopal Rawat', 'Savita Rawat', '9876543210')
  ON CONFLICT (id) DO NOTHING;

END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ══════════════════════════════════════════════════════════════════════════════
