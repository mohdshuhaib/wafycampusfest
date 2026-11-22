-- Migration to add group_label column to public.participations for multi-group items (Grade C and Grade D)
ALTER TABLE public.participations 
ADD COLUMN IF NOT EXISTS group_label text;

CREATE INDEX IF NOT EXISTS idx_participations_group_label ON public.participations(group_label);
