-- Add booking_source column to bookings table
ALTER TABLE bookings 
ADD COLUMN booking_source text CHECK (booking_source IN ('WALK_IN', 'FINDYOURFARES', 'AGENT'));

-- Comment: This column stores where the booking originated.
-- 'WALK_IN' and 'FINDYOURFARES' imply no specific agent linkage (agent_id will be NULL).
-- 'AGENT' implies an agent_id is required.
