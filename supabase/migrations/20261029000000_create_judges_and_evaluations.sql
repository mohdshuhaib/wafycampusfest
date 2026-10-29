-- Migration: Create Judges, Judge Assignments, and Judge Evaluations tables
-- Supports multi-judge evaluation with 4-criterion rubrics (30, 30, 20, 20),
-- automatic grade calculation, positive/negative remarks, and overall programme remarks.

-- 1. Extend user_role enum to include 'judge' if not present
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'judge';

-- 2. Relax captain_profiles_need_team constraint on profiles table so non-captains do not require team_id
-- (Using role::text != 'captain' to avoid Postgres 55P04 uncommitted enum error in single transaction)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS captain_profiles_need_team;
ALTER TABLE public.profiles ADD CONSTRAINT captain_profiles_need_team 
  CHECK (role::text != 'captain' OR team_id IS NOT NULL);

-- 3. Create judges table
CREATE TABLE IF NOT EXISTS public.judges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create judge_assignments table
CREATE TABLE IF NOT EXISTS public.judge_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id uuid NOT NULL REFERENCES public.judges(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  rule_criterion_1 text NOT NULL DEFAULT 'Criterion 1 (Max 30)',
  rule_criterion_2 text NOT NULL DEFAULT 'Criterion 2 (Max 30)',
  rule_criterion_3 text NOT NULL DEFAULT 'Criterion 3 (Max 20)',
  rule_criterion_4 text NOT NULL DEFAULT 'Criterion 4 (Max 20)',
  overall_remarks text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT judge_event_unique UNIQUE (judge_id, event_id)
);

-- 5. Create judge_evaluations table
CREATE TABLE IF NOT EXISTS public.judge_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES public.judge_assignments(id) ON DELETE CASCADE,
  judge_id uuid NOT NULL REFERENCES public.judges(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  chest_no text NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  student_name text,
  team_name text,
  mark_criterion_1 numeric(5,2) NOT NULL DEFAULT 0 CHECK (mark_criterion_1 >= 0 AND mark_criterion_1 <= 30),
  mark_criterion_2 numeric(5,2) NOT NULL DEFAULT 0 CHECK (mark_criterion_2 >= 0 AND mark_criterion_2 <= 30),
  mark_criterion_3 numeric(5,2) NOT NULL DEFAULT 0 CHECK (mark_criterion_3 >= 0 AND mark_criterion_3 <= 20),
  mark_criterion_4 numeric(5,2) NOT NULL DEFAULT 0 CHECK (mark_criterion_4 >= 0 AND mark_criterion_4 <= 20),
  total_marks numeric(5,2) NOT NULL DEFAULT 0 CHECK (total_marks >= 0 AND total_marks <= 100),
  grade text NOT NULL DEFAULT 'None',
  positive_remarks text DEFAULT '',
  negative_remarks text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT judge_event_chest_unique UNIQUE (judge_id, event_id, chest_no)
);

-- Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_judge_assignments_judge ON public.judge_assignments(judge_id);
CREATE INDEX IF NOT EXISTS idx_judge_assignments_event ON public.judge_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_judge_evaluations_assignment ON public.judge_evaluations(assignment_id);
CREATE INDEX IF NOT EXISTS idx_judge_evaluations_judge_event ON public.judge_evaluations(judge_id, event_id);
CREATE INDEX IF NOT EXISTS idx_judge_evaluations_chest_no ON public.judge_evaluations(chest_no);

-- Enable RLS
ALTER TABLE public.judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_evaluations ENABLE ROW LEVEL SECURITY;

-- Admins full access policies
DO $$ BEGIN
  CREATE POLICY "Admins full access to judges" ON public.judges
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins full access to judge_assignments" ON public.judge_assignments
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins full access to judge_evaluations" ON public.judge_evaluations
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Judge self-access policies
DO $$ BEGIN
  CREATE POLICY "Judges can read own profile" ON public.judges
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Judges can read own assignments" ON public.judge_assignments
    FOR SELECT TO authenticated
    USING (judge_id IN (SELECT id FROM public.judges WHERE user_id = auth.uid() OR id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Judges can update own assignments overall_remarks" ON public.judge_assignments
    FOR UPDATE TO authenticated
    USING (judge_id IN (SELECT id FROM public.judges WHERE user_id = auth.uid() OR id = auth.uid()))
    WITH CHECK (judge_id IN (SELECT id FROM public.judges WHERE user_id = auth.uid() OR id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Judges can manage own evaluations" ON public.judge_evaluations
    FOR ALL TO authenticated
    USING (judge_id IN (SELECT id FROM public.judges WHERE user_id = auth.uid() OR id = auth.uid()))
    WITH CHECK (judge_id IN (SELECT id FROM public.judges WHERE user_id = auth.uid() OR id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null;
END $$;
