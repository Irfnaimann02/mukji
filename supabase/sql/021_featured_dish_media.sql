-- #69: optional restaurant-provided or verified featured-dish media.
-- Nullable columns keep existing restaurant rows valid.

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS featured_dish_name_en text,
  ADD COLUMN IF NOT EXISTS featured_dish_image_url text;

COMMENT ON COLUMN public.restaurants.featured_dish_name_en IS
  'English name of the dish represented by featured_dish_image_url.';

COMMENT ON COLUMN public.restaurants.featured_dish_image_url IS
  'URL of restaurant-provided or otherwise verified media for featured_dish_name_en.';
