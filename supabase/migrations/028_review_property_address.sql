-- Add property_address text field to reviews so renters can specify the address
-- without needing a property_id FK lookup
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS property_address TEXT;
