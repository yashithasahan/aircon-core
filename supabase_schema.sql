-- Create Bookings Table
create table public.bookings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  pax_name text not null,
  pnr text not null,
  ticket_number text,
  airline text,
  entry_date date not null default CURRENT_DATE,
  departure_date date not null,
  return_date date,
  fare numeric(10, 2) default 0,
  selling_price numeric(10, 2) default 0,
  profit numeric(10, 2) generated always as (selling_price - fare) stored,
  payment_status text default 'PENDING'
);

-- Enable Row Level Security (RLS)
alter table public.bookings enable row level security;

-- Create Policy: Allow authenticated users to doing everything
create policy "Enable all access for authenticated users"
on public.bookings
for all
to authenticated
using (true)
with check (true);
