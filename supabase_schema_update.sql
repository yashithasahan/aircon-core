-- Create Passengers Table
create table public.passengers (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  passport_number text,
  contact_info text
);

-- Enable RLS for Passengers
alter table public.passengers enable row level security;

create policy "Enable all access for authenticated users (passengers)"
on public.passengers
for all
to authenticated
using (true)
with check (true);

-- Add passenger_id to Bookings
alter table public.bookings 
add column passenger_id uuid references public.passengers(id);
