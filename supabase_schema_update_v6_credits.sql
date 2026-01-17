-- Add balance tracking to booking_types
ALTER TABLE public.booking_types 
ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS daily_ticket_count integer DEFAULT 0 NOT NULL;

-- Create Credit Transactions Table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_type_id uuid REFERENCES public.booking_types(id) ON DELETE CASCADE NOT NULL,
    amount numeric NOT NULL,
    transaction_type text NOT NULL CHECK (transaction_type IN ('TOPUP', 'BOOKING_DEDUCTION', 'REFUND', 'ADJUSTMENT')),
    reference_id uuid, -- Can link to booking_id if applicable
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Enable all access for authenticated users" 
ON public.credit_transactions 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
