-- Migration to add stage column to public.programme_schedules
ALTER TABLE public.programme_schedules 
ADD COLUMN IF NOT EXISTS stage text DEFAULT 'Stage 1';

-- Index for stage queries
CREATE INDEX IF NOT EXISTS idx_programme_schedules_stage ON public.programme_schedules(stage);
