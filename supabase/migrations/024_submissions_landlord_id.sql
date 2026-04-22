-- Add landlord_id to landlord_submissions to track which landlord was created on approval
ALTER TABLE public.landlord_submissions
  ADD COLUMN IF NOT EXISTS landlord_id UUID REFERENCES public.landlords(id);
