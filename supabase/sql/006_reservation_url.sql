-- Issue #16: support optional online restaurant reservations.
-- NULL means the restaurant does not have a known online booking page.

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS reservation_url TEXT;