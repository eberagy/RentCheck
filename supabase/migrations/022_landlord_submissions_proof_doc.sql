-- Migration 022: Add proof_doc_url to landlord_submissions
-- Stores the uploaded proof document URL when users submit a new landlord

ALTER TABLE public.landlord_submissions
  ADD COLUMN IF NOT EXISTS proof_doc_url TEXT;
