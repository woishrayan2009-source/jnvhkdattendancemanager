-- ============================================================
-- JNV HKD Attendance Management System — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. SCHOOLS  (multi-tenancy anchor)
-- ============================================================
CREATE TABLE public.schools (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  code        text NOT NULL UNIQUE,           -- e.g. JNV-HKD
  address     text,
  config      jsonb DEFAULT '{}'::jsonb,      -- session times, etc.
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed the school
INSERT INTO public.schools (id, name, code, address)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  'Jawahar Navodaya Vidyalaya, Haridwar',
  'JNV-HKD',
  'Haridwar, Uttarakhand'
);

-- ============================================================
-- 2. HOUSES
-- ============================================================
CREATE TABLE public.houses (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text NOT NULL DEFAULT '#1a3a5c',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, name)
);

INSERT INTO public.houses (id, school_id, name, color) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Nilgiri',  '#16a34a'),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Arawali',  '#2563eb'),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Shiwalik', '#dc2626'),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'Udaygiri', '#d97706');

-- ============================================================
-- 3. CLASSES
-- ============================================================
CREATE TABLE public.classes (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  grade       int  NOT NULL CHECK (grade BETWEEN 6 AND 12),
  section     text NOT NULL CHECK (section IN ('A','B','Science','Commerce')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, grade, section),
  -- Enforce section names by grade range
  CONSTRAINT valid_section_for_grade CHECK (
    (grade BETWEEN 6 AND 10 AND section IN ('A','B')) OR
    (grade BETWEEN 11 AND 12 AND section IN ('Science','Commerce'))
  )
);

-- Seed all 14 sections
INSERT INTO public.classes (school_id, grade, section) VALUES
  -- Classes 6-10: A & B
  ('a1000000-0000-0000-0000-000000000001', 6,  'A'),
  ('a1000000-0000-0000-0000-000000000001', 6,  'B'),
  ('a1000000-0000-0000-0000-000000000001', 7,  'A'),
  ('a1000000-0000-0000-0000-000000000001', 7,  'B'),
  ('a1000000-0000-0000-0000-000000000001', 8,  'A'),
  ('a1000000-0000-0000-0000-000000000001', 8,  'B'),
  ('a1000000-0000-0000-0000-000000000001', 9,  'A'),
  ('a1000000-0000-0000-0000-000000000001', 9,  'B'),
  ('a1000000-0000-0000-0000-000000000001', 10, 'A'),
  ('a1000000-0000-0000-0000-000000000001', 10, 'B'),
  -- Classes 11-12: Science & Commerce
  ('a1000000-0000-0000-0000-000000000001', 11, 'Science'),
  ('a1000000-0000-0000-0000-000000000001', 11, 'Commerce'),
  ('a1000000-0000-0000-0000-000000000001', 12, 'Science'),
  ('a1000000-0000-0000-0000-000000000001', 12, 'Commerce');

-- ============================================================
-- 4. STUDENTS
-- ============================================================
CREATE TABLE public.students (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id         uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  house_id          uuid NOT NULL REFERENCES public.houses(id),
  class_id          uuid NOT NULL REFERENCES public.classes(id),
  roll_number       text NOT NULL,
  name              text NOT NULL,
  gender            text NOT NULL CHECK (gender IN ('Male','Female')),
  admission_number  text,
  date_of_birth     date,
  parent_name       text,
  parent_phone      text,
  qr_token          text NOT NULL UNIQUE DEFAULT uuid_generate_v4()::text,
  is_active         boolean NOT NULL DEFAULT true,
  is_alumni         boolean NOT NULL DEFAULT false,  -- set on class-12 promotion
  alumni_year       int,                              -- academic year they graduated
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, roll_number)
);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 5. PROFILES  (extends auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id   uuid NOT NULL REFERENCES public.schools(id),
  house_id    uuid REFERENCES public.houses(id),  -- null = all houses
  role        text NOT NULL CHECK (role IN (
                 'super_admin','principal','house_master','class_teacher','staff'
               )),
  full_name   text NOT NULL,
  email       text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile slot on user signup (filled in by super_admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Profile is created explicitly by super_admin via app; this just ensures the row exists
  RETURN NEW;
END;
$$;

-- ============================================================
-- 6. ATTENDANCE SESSIONS
-- ============================================================
CREATE TABLE public.attendance_sessions (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     uuid NOT NULL REFERENCES public.schools(id),
  house_id      uuid NOT NULL REFERENCES public.houses(id),
  session_date  date NOT NULL,
  session_type  text NOT NULL CHECK (session_type IN ('morning','evening','night')),
  opened_by     uuid NOT NULL REFERENCES public.profiles(id),
  opened_at     timestamptz NOT NULL DEFAULT now(),
  submitted_at  timestamptz,
  submitted_by  uuid REFERENCES public.profiles(id),
  is_finalized  boolean NOT NULL DEFAULT false,
  amendment_count int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id, house_id, session_date, session_type)
);

-- ============================================================
-- 7. ATTENDANCE RECORDS
-- ============================================================
CREATE TABLE public.attendance_records (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id        uuid NOT NULL REFERENCES public.students(id),
  status            text NOT NULL DEFAULT 'present'
                      CHECK (status IN ('present','absent','leave')),
  leave_type        text CHECK (leave_type IN ('HL','ML','CL','SA','OD')),
  remarks           text,
  marked_by         uuid NOT NULL REFERENCES public.profiles(id),
  marked_at         timestamptz NOT NULL DEFAULT now(),
  amended_by        uuid REFERENCES public.profiles(id),
  amended_at        timestamptz,
  amendment_reason  text,
  is_offline_sync   boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, student_id),
  -- leave_type required when status = 'leave'
  CONSTRAINT leave_type_required CHECK (
    status != 'leave' OR leave_type IS NOT NULL
  )
);

-- ============================================================
-- 8. LEAVES  (standalone leave registry)
-- ============================================================
CREATE TABLE public.leaves (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     uuid NOT NULL REFERENCES public.schools(id),
  student_id    uuid NOT NULL REFERENCES public.students(id),
  leave_type    text NOT NULL CHECK (leave_type IN ('HL','ML','CL','SA','OD')),
  from_date     date NOT NULL,
  to_date       date NOT NULL,
  reason        text,
  recorded_by   uuid NOT NULL REFERENCES public.profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (to_date >= from_date)
);

-- ============================================================
-- 9. OFFLINE SYNC LOG  (server-side record of synced ops)
-- ============================================================
CREATE TABLE public.sync_log (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     uuid NOT NULL REFERENCES public.schools(id),
  user_id       uuid NOT NULL REFERENCES public.profiles(id),
  operation     text NOT NULL,   -- 'mark_attendance' | 'record_leave' etc.
  payload       jsonb NOT NULL,
  synced_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_students_school_house  ON public.students(school_id, house_id);
CREATE INDEX idx_students_school_class  ON public.students(school_id, class_id);
CREATE INDEX idx_students_qr_token      ON public.students(qr_token);
CREATE INDEX idx_students_active        ON public.students(is_active) WHERE is_active = true;
CREATE INDEX idx_sessions_date_house    ON public.attendance_sessions(session_date, house_id);
CREATE INDEX idx_records_session        ON public.attendance_records(session_id);
CREATE INDEX idx_records_student        ON public.attendance_records(student_id);
CREATE INDEX idx_leaves_student         ON public.leaves(student_id);
CREATE INDEX idx_leaves_dates           ON public.leaves(from_date, to_date);

-- ============================================================
-- HELPER FUNCTION: get caller's profile
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.schools            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log           ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- ── schools ──────────────────────────────────────────────────
-- Any authenticated user can read their own school
CREATE POLICY "schools: read own school" ON public.schools
  FOR SELECT TO authenticated
  USING (id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- Only super_admin can modify schools
CREATE POLICY "schools: super_admin write" ON public.schools
  FOR ALL TO authenticated
  USING  ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- ── houses ───────────────────────────────────────────────────
CREATE POLICY "houses: read own school" ON public.houses
  FOR SELECT TO authenticated
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "houses: super_admin write" ON public.houses
  FOR ALL TO authenticated
  USING  ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- ── classes ──────────────────────────────────────────────────
CREATE POLICY "classes: read own school" ON public.classes
  FOR SELECT TO authenticated
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "classes: super_admin write" ON public.classes
  FOR ALL TO authenticated
  USING  ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- ── students ─────────────────────────────────────────────────
-- All authenticated staff of same school can read students
CREATE POLICY "students: read own school" ON public.students
  FOR SELECT TO authenticated
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- Only super_admin can INSERT/DELETE students
CREATE POLICY "students: super_admin insert" ON public.students
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

CREATE POLICY "students: super_admin delete" ON public.students
  FOR DELETE TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- super_admin + principal can UPDATE students
CREATE POLICY "students: admin update" ON public.students
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
    IN ('super_admin','principal')
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
    IN ('super_admin','principal')
  );

-- ── profiles ─────────────────────────────────────────────────
-- Users can read all profiles in their school
CREATE POLICY "profiles: read own school" ON public.profiles
  FOR SELECT TO authenticated
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- Users can update their own profile (name only; role changes via super_admin)
CREATE POLICY "profiles: self update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- super_admin can manage all profiles
CREATE POLICY "profiles: super_admin write" ON public.profiles
  FOR ALL TO authenticated
  USING  ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin');

-- ── attendance_sessions ───────────────────────────────────────
-- All staff of same school can read sessions
CREATE POLICY "sessions: read own school" ON public.attendance_sessions
  FOR SELECT TO authenticated
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- House masters can open sessions for their own house;
-- principal + super_admin can open any session
CREATE POLICY "sessions: open" ON public.attendance_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    AND (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('principal','super_admin')
      OR (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'house_master'
        AND house_id = (SELECT house_id FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

-- Sessions can be updated by: opener (own session) OR principal/super_admin
CREATE POLICY "sessions: update by opener or admin" ON public.attendance_sessions
  FOR UPDATE TO authenticated
  USING (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    AND (
      opened_by = auth.uid()
      OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('principal','super_admin')
    )
  )
  WITH CHECK (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    AND (
      opened_by = auth.uid()
      OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('principal','super_admin')
    )
  );

-- ── attendance_records ────────────────────────────────────────
-- All staff of same school can read records
CREATE POLICY "records: read own school" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (
    session_id IN (
      SELECT s.id FROM public.attendance_sessions s
      JOIN public.profiles p ON p.school_id = s.school_id
      WHERE p.id = auth.uid()
    )
  );

-- House masters insert for their house sessions; principal/super_admin for any
CREATE POLICY "records: insert" ON public.attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (
    session_id IN (
      SELECT s.id FROM public.attendance_sessions s
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE p.school_id = s.school_id
        AND (
          p.role IN ('principal','super_admin')
          OR (p.role = 'house_master' AND s.house_id = p.house_id)
        )
    )
  );

-- Records updated by: marker (own records) OR principal/super_admin
-- House master can amend their own finalized records
CREATE POLICY "records: update" ON public.attendance_records
  FOR UPDATE TO authenticated
  USING (
    marked_by = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('principal','super_admin')
  )
  WITH CHECK (
    marked_by = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('principal','super_admin')
  );

-- ── leaves ───────────────────────────────────────────────────
CREATE POLICY "leaves: read own school" ON public.leaves
  FOR SELECT TO authenticated
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- house_master, principal, super_admin can record leaves
CREATE POLICY "leaves: insert" ON public.leaves
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid())
       IN ('super_admin','principal','house_master')
  );

-- principal + super_admin can update/delete leaves
CREATE POLICY "leaves: admin update delete" ON public.leaves
  FOR ALL TO authenticated
  USING (
    school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid())
       IN ('super_admin','principal')
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid())
    IN ('super_admin','principal')
  );

-- ── sync_log ─────────────────────────────────────────────────
CREATE POLICY "sync_log: read own" ON public.sync_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "sync_log: insert own" ON public.sync_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- VIEWS (for dashboard convenience)
-- ============================================================

-- Today's session summary per house
CREATE OR REPLACE VIEW public.today_session_summary AS
SELECT
  s.school_id,
  s.house_id,
  h.name            AS house_name,
  h.color           AS house_color,
  s.session_date,
  s.session_type,
  s.is_finalized,
  s.id              AS session_id,
  COUNT(r.id)       AS total_marked,
  COUNT(r.id) FILTER (WHERE r.status = 'present') AS present_count,
  COUNT(r.id) FILTER (WHERE r.status = 'absent')  AS absent_count,
  COUNT(r.id) FILTER (WHERE r.status = 'leave')   AS leave_count
FROM public.attendance_sessions s
JOIN public.houses h ON h.id = s.house_id
LEFT JOIN public.attendance_records r ON r.session_id = s.id
WHERE s.session_date = CURRENT_DATE
GROUP BY s.school_id, s.house_id, h.name, h.color,
         s.session_date, s.session_type, s.is_finalized, s.id;

-- ============================================================
-- REALTIME  (enable for live dashboard updates)
-- ============================================================
-- Run in Supabase dashboard: Realtime > Tables > enable for:
--   attendance_sessions, attendance_records

-- ============================================================
-- STORAGE BUCKET (for future student photos)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('student-photos', 'student-photos', false);
