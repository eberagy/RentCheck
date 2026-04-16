-- ============================================================
-- Migration 002: Reviews
-- ============================================================

CREATE TABLE public.reviews (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  landlord_id           UUID REFERENCES public.landlords(id) ON DELETE CASCADE,
  property_id           UUID REFERENCES public.properties(id) ON DELETE SET NULL,

  -- Ratings (1-5 each)
  rating_overall        INTEGER CHECK (rating_overall BETWEEN 1 AND 5) NOT NULL,
  rating_responsiveness INTEGER CHECK (rating_responsiveness BETWEEN 1 AND 5),
  rating_maintenance    INTEGER CHECK (rating_maintenance BETWEEN 1 AND 5),
  rating_honesty        INTEGER CHECK (rating_honesty BETWEEN 1 AND 5),
  rating_lease_fairness INTEGER CHECK (rating_lease_fairness BETWEEN 1 AND 5),
  would_rent_again      BOOLEAN,

  -- Content
  title                 TEXT NOT NULL CHECK (length(title) BETWEEN 10 AND 150),
  body                  TEXT NOT NULL CHECK (length(body) >= 50 AND length(body) <= 2000),
  rental_period_start   DATE,
  rental_period_end     DATE,
  is_current_tenant     BOOLEAN DEFAULT FALSE,

  -- Lease verification
  lease_verified        BOOLEAN DEFAULT FALSE,
  lease_doc_path        TEXT,        -- Storage path — never exposed via public API
  lease_verified_at     TIMESTAMPTZ,
  lease_verified_by     UUID REFERENCES public.profiles(id), -- admin who verified
  lease_hash            TEXT,        -- SHA-256 for dedup
  lease_filename        TEXT,        -- Original filename for admin UI
  lease_file_size       INTEGER,     -- bytes

  -- Status workflow: pending → approved | rejected | flagged
  status                TEXT CHECK (status IN ('pending','approved','rejected','flagged')) DEFAULT 'pending',
  moderation_note       TEXT,
  moderated_by          UUID REFERENCES public.profiles(id),
  moderated_at          TIMESTAMPTZ,

  -- Landlord response (verified landlords only)
  landlord_response     TEXT CHECK (landlord_response IS NULL OR length(landlord_response) <= 1000),
  landlord_response_at  TIMESTAMPTZ,
  landlord_response_status TEXT CHECK (landlord_response_status IN ('pending','approved','rejected')),

  -- Engagement
  helpful_count         INTEGER DEFAULT 0,
  flag_count            INTEGER DEFAULT 0,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_landlord ON public.reviews(landlord_id);
CREATE INDEX idx_reviews_status ON public.reviews(status);
CREATE INDEX idx_reviews_reviewer ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_created ON public.reviews(created_at DESC);
CREATE INDEX idx_reviews_property ON public.reviews(property_id);

-- Evidence files attached to reviews
CREATE TABLE public.review_evidence (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id   UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
  file_path   TEXT NOT NULL,
  file_name   TEXT,
  file_type   TEXT,
  file_size   INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
