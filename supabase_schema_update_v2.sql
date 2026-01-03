-- Add new fields to bookings
ALTER TABLE public.bookings ADD COLUMN ticket_status text DEFAULT 'PENDING';
ALTER TABLE public.bookings ADD COLUMN ticket_issued_date date;
ALTER TABLE public.bookings ADD COLUMN advance_payment numeric(10, 2) DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN platform text;

-- Add new fields to passengers (phone number was requested)
ALTER TABLE public.passengers ADD COLUMN phone_number text;

-- Note: User mentioned "Type change to platform". I created "booking_types" earlier.
-- I will keep "Platform" as a simple text field or leverage existing booking_type logic if relevant,
-- but typically "Platform" implies where the booking was made (e.g. GDS, Web).
-- I'll stick to a simple text column for flexibility unless specified.
