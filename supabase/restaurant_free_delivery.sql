-- Free delivery becomes a flag of its own rather than a magic badge label.
-- On the homepage card it reads as a green "Free" at the head of the cuisine
-- line, which the badge pill can no longer express now that badges are free
-- text.
alter table restaurants
  add column if not exists free_delivery boolean default false;

-- Carry over the rows that used the old label, then drop it: the flag now
-- draws that state, and leaving the badge would show it twice.
update restaurants set free_delivery = true where badge = 'Free Delivery';
update restaurants set badge = null where badge = 'Free Delivery';

comment on column restaurants.free_delivery is
  'Shows a green "Free" at the start of the card''s cuisine line.';
