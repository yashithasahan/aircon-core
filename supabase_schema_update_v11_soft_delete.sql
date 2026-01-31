-- Add is_deleted column to tables for Soft Delete functionality

-- Bookings
ALTER TABLE bookings ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_bookings_is_deleted ON bookings(is_deleted);

-- Agents
ALTER TABLE agents ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_agents_is_deleted ON agents(is_deleted);

-- Issued Partners (Booking Types)
ALTER TABLE issued_partners ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_issued_partners_is_deleted ON issued_partners(is_deleted);

-- Platforms
ALTER TABLE platforms ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_platforms_is_deleted ON platforms(is_deleted);

-- Passengers
ALTER TABLE passengers ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_passengers_is_deleted ON passengers(is_deleted);
