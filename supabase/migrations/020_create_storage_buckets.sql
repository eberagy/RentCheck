-- ============================================================
-- Migration 020: Create storage buckets
-- These were referenced in RLS policies but never actually created.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('lease-docs', 'lease-docs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('landlord-verification-docs', 'landlord-verification-docs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-photos', 'evidence-photos', false)
ON CONFLICT (id) DO NOTHING;
