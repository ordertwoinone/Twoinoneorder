-- Separate web vs mobile content for hero banners and home categories.
-- Existing rows default to 'mobile' so the current mobile homepage is unchanged.
ALTER TABLE public.hero_banners   ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'mobile';
ALTER TABLE public.home_categories ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'mobile';

COMMENT ON COLUMN public.hero_banners.platform   IS 'Which view this banner shows on: web | mobile';
COMMENT ON COLUMN public.home_categories.platform IS 'Which view this category shows on: web | mobile';
