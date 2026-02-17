
-- Add parent_booking_id to bookings table for Reissue/Split PNR linking
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS parent_booking_id UUID REFERENCES public.bookings(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS bookings_parent_booking_id_idx ON public.bookings(parent_booking_id);
