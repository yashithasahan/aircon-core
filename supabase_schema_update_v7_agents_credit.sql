-- Add balance tracking to agents
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS daily_ticket_count integer DEFAULT 0 NOT NULL;

-- Update Credit Transactions to support Agents
ALTER TABLE public.credit_transactions
ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE;

-- Update constraint to allow either booking_type_id OR agent_id (or both null if generic? No, keeping strict).
-- The existing booking_type_id was NOT NULL. We need to make it NULLABLE first if we want to allow agent-only transactions.
ALTER TABLE public.credit_transactions 
ALTER COLUMN booking_type_id DROP NOT NULL;

-- Add check constraint ensuring at least one target exists
ALTER TABLE public.credit_transactions
ADD CONSTRAINT chk_transaction_target CHECK (
    (booking_type_id IS NOT NULL AND agent_id IS NULL) OR
    (booking_type_id IS NULL AND agent_id IS NOT NULL)
);

-- Note: The existing transactions have booking_type_id, so they satisfy the check.
