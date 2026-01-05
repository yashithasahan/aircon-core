-- Add passenger_type to passengers table
ALTER TABLE public.passengers ADD COLUMN passenger_type text DEFAULT 'ADULT';
