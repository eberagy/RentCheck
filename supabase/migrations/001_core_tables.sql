-- ============================================================
-- Migration 001: Core Tables
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── PROFILES ────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id                    UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email                 TEXT NOT NULL,
  full_name             TEXT,
  user_type             TEXT CHECK (user_type IN ('renter','landlord','admin')) DEFAULT 'renter',
  is_verified_landlord  BOOLEAN DEFAULT FALSE,
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  subscription_status   TEXT,
  avatar_url            TEXT,
  bio                   TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- ─── LANDLORDS ───────────────────────────────────────────────
CREATE TABLE public.landlords (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug                  TEXT UNIQUE NOT NULL,
  display_name          TEXT NOT NULL,
  business_name         TEXT,
  claimed_by            UUID REFERENCES public.profiles(id),
  is_claimed            BOOLEAN DEFAULT FALSE,
  is_verified           BOOLEAN DEFAULT FALSE,
  verification_docs_url TEXT,
  verification_date     TIMESTAMPTZ,
  avg_rating            NUMERIC(3,2) DEFAULT 0,
  review_count          INTEGER DEFAULT 0,
  city                  TEXT,
  state                 TEXT,
  state_abbr            TEXT,
  zip                   TEXT,
  lat                   NUMERIC(10,7),
  lng                   NUMERIC(10,7),
  bio                   TEXT,
  website               TEXT,
  phone                 TEXT,
  -- Landlord grade: A/B/C/D/F computed from violations + avg_rating
  grade                 TEXT CHECK (grade IN ('A','B','C','D','F')),
  open_violation_count  INTEGER DEFAULT 0,
  total_violation_count INTEGER DEFAULT 0,
  eviction_count        INTEGER DEFAULT 0,
  -- Scaffolded for future paid features
  stripe_price_id       TEXT,
  -- OpenCorporates (Phase 2)
  opencorporates_id     TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_landlords_slug ON public.landlords(slug);
CREATE INDEX idx_landlords_city_state ON public.landlords(city, state_abbr);
CREATE INDEX idx_landlords_claimed ON public.landlords(is_claimed);
CREATE INDEX idx_landlords_verified ON public.landlords(is_verified);

-- ─── PROPERTIES ──────────────────────────────────────────────
CREATE TABLE public.properties (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id      UUID REFERENCES public.landlords(id) ON DELETE SET NULL,
  address_line1    TEXT NOT NULL,
  address_line2    TEXT,
  city             TEXT NOT NULL,
  state            TEXT NOT NULL,
  state_abbr       TEXT NOT NULL,
  zip              TEXT NOT NULL,
  lat              NUMERIC(10,7),
  lng              NUMERIC(10,7),
  property_type    TEXT CHECK (property_type IN ('apartment','house','condo','townhouse','commercial','other')),
  unit_count       INTEGER,
  year_built       INTEGER,
  avg_rating       NUMERIC(3,2) DEFAULT 0,
  review_count     INTEGER DEFAULT 0,
  -- Normalized address for dedup
  address_normalized TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_properties_landlord ON public.properties(landlord_id);
CREATE INDEX idx_properties_city_state ON public.properties(city, state_abbr);
CREATE INDEX idx_properties_zip ON public.properties(zip);
