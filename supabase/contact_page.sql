-- Contact page editable content (stored on the single site_settings row)
-- Phone / email / WhatsApp / address are already on site_settings; these add
-- the hero copy and opening hours so the Contact page is fully admin-driven.
alter table site_settings
  add column if not exists contact_heading text default 'We''d Love to',
  add column if not exists contact_heading_highlight text default 'Hear From You',
  add column if not exists contact_subheading text default 'Questions about an order, catering, or a table booking? Our team is here to help — reach us any way you like and we''ll reply fast.',
  add column if not exists contact_hours text default 'Every day · 9:00 AM – 11:00 PM';
