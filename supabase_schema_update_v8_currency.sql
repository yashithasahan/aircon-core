-- Add currency column to bookings table, default to EUR
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'EUR' NOT NULL CHECK (currency IN ('EUR', 'LKR'));

-- Update existing records to EUR (handled by default, but explicit update for safety if needed)
-- UPDATE public.bookings SET currency = 'EUR' WHERE currency IS NULL;
