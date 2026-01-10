-- Create Booking History Table
CREATE TABLE public.booking_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL, -- e.g., 'STATUS_CHANGE', 'CREATED'
  previous_status text,
  new_status text,
  details text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.booking_history ENABLE ROW LEVEL SECURITY;

-- Policy (simplest for now, same as others)
CREATE POLICY "Enable all access for authenticated users" 
ON public.booking_history 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
