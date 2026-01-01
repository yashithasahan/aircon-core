-- Refactor Passengers Table: Split name into title, surname, name
ALTER TABLE public.passengers ADD COLUMN title text;
ALTER TABLE public.passengers ADD COLUMN surname text;
ALTER TABLE public.passengers ADD COLUMN first_name text;

-- Data migration: attempt to split existing names (Naive approach)
-- This is a best-effort migration. Users might need to fix data manually.
UPDATE public.passengers
SET
  first_name = split_part(name, ' ', 1),
  surname = SUBSTRING(name FROM POSITION(' ' IN name) + 1);

-- Optionally drop the old name column if you are sure, or keep it as a computed column/legacy
-- ALTER TABLE public.passengers DROP COLUMN name;


-- Create Agents Table
CREATE TABLE public.agents (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null unique
);
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON public.agents FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- Create Booking Types Table
CREATE TABLE public.booking_types (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null unique
);
ALTER TABLE public.booking_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON public.booking_types FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- Update Bookings Table
ALTER TABLE public.bookings ADD COLUMN origin text;
ALTER TABLE public.bookings ADD COLUMN destination text;
ALTER TABLE public.bookings ADD COLUMN agent_id uuid REFERENCES public.agents(id);
ALTER TABLE public.bookings ADD COLUMN booking_type_id uuid REFERENCES public.booking_types(id);

-- Optional: Add foreign key for passenger if not already strict
-- ALTER TABLE public.bookings ADD CONSTRAINT fk_passenger FOREIGN KEY (passenger_id) REFERENCES public.passengers(id);
