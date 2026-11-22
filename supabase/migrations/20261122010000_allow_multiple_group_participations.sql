-- Migration: Allow multiple group entries per team in group events (Grade C and Grade D)
-- Drop the single-team-per-event unique constraint on participations where student_id is null.

DROP INDEX IF EXISTS public.participations_unique_team_event_result;
