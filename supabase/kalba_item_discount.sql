-- A percentage off one Popular Around Campus dish.
--
-- Set in admin → University Kalba → Popular Around Campus → edit an item →
-- Offer. 0 means no offer, which is what every existing dish gets.
--
-- The discount comes off the dish's own price, before any options are added:
-- "10% off the burger" should not quietly discount the extra cheese too.
--
-- Safe to re-run. The site works whether or not it has: the pages select every
-- column rather than naming them, and a dish reads as 0% until this is run.

ALTER TABLE kalba_popular_items
  ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) NOT NULL DEFAULT 0;
