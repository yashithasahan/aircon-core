-- Create platforms table
create table if not exists platforms (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null
);

-- Enable RLS
alter table platforms enable row level security;

-- Policies
create policy "Enable read access for all users" on platforms for select using (true);
create policy "Enable insert for authenticated users only" on platforms for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users only" on platforms for update using (auth.role() = 'authenticated');
create policy "Enable delete for authenticated users only" on platforms for delete using (auth.role() = 'authenticated');
