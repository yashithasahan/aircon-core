-- Add refund tracking columns to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS refund_date timestamp with time zone;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS actual_refund_amount numeric DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_refund_amount numeric DEFAULT 0;

-- Note: ticket_status is text/varchar in many setups, but if it was an enum, we'd need to alter the enum.
-- Based on previous code, it seems to be just text or matched in app code.
-- IF it is a postgres ENUM type, we would do:
-- ALTER TYPE ticket_status_enum ADD VALUE 'VOID';
-- ALTER TYPE ticket_status_enum ADD VALUE 'REFUNDED';
-- But simplified assumption (based on standard Supabase usage here) is text column with text check constraints or just app level enforcement.
