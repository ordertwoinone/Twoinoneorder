This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Languages (English / العربية)

Everything lives in `lib/i18n`. The switcher sits in the header; the choice is
saved to `localStorage` and, on a first visit, detected from the browser.

**Adding or changing copy**

1. Add the key to `lib/i18n/dictionaries/en.ts` — that file is the source of truth.
2. Add the same key to `ar.ts`. It is typed against English, so a missing key is
   a build error.
3. Read it in a component:

   ```tsx
   const { t, tp } = useTranslation();
   t("nav.home")                       // "Home" / "الرئيسية"
   t("footer.rights", { year: 2026 })  // fills {year}
   tp("common.items", 3)               // picks the right plural branch
   ```

   In a **server** component use `<T k="nav.home" />` instead, which keeps the
   surrounding section (and its Supabase query) on the server.

**Adding a language**: add it to `LOCALES` in `lib/i18n/config.ts`, add a
dictionary file, and register its loader in `dictionaries/index.ts`. The
switcher, the pre-hydration script, the sitemap and the SEO tags all read from
that list.

**How it fits together**

- `LocaleScript` runs in `<head>` before first paint and stamps `<html lang dir>`
  from `?lang=` → `localStorage` → `navigator.languages`. That is what keeps the
  pages statically generated (ISR) while still opening right-to-left for an
  Arabic visitor.
- `I18nProvider` owns the active locale, lazy-loads the Arabic dictionary as its
  own chunk, and keeps the title, description, Open Graph tags and hreflang links
  in step.
- `PageMeta` lets a route claim its own translated title and description.
- **RTL needs no per-component overrides.** Every directional utility in the app
  is a logical one (`ms`/`me`, `ps`/`pe`, `start`/`end`, `text-start`), which
  compiles identically in LTR and mirrors automatically under `dir="rtl"`. The
  only extras are in `globals.css`: the Arabic typeface, a small line-height
  bump, mirrored arrow glyphs, `.force-ltr` for phone numbers and e-mail, and
  `.edge-fade` for gradients that must follow the text side.
- Admin-managed content (banners, dish names, offers) shows exactly as entered.
  Where the admin panel is still on our seeded English defaults, `tMaybe` maps
  those known strings to dictionary keys so they translate anyway.

## Branding

The logo comes from **admin → Header** (`header_logo_url`), falling back to
**admin → Settings** (`logo_url`) and then to `/public/logos/two-in-one.png`.
`lib/branding.ts` is the single source; the header, footer, splash screen,
account page, 404 and install prompt all read from it, so uploading a new logo
changes every one of them.

## Shipday Delivery

**admin → Shipday Delivery** shows the delivery half of an order: which driver
has it, where it has got to, and when each step happened. take.app owns the
order; Shipday owns the delivery.

**How it fills.** Accepting an order sends it to Shipday, Shipday assigns a
driver, and every step after that is POSTed to `/webhooks/shipday`. Each event
is upserted into `shipday_deliveries` on the Shipday order id, and the admin
screen listens to that table over SSE — so a driver assignment appears without
anyone refreshing. A minute-timer reload sits under the stream as a safety net.

**Setting it up**

1. Run `supabase/shipday_deliveries.sql` in the Supabase SQL editor.
2. Set `SHIPDAY_WEBHOOK_TOKEN` to the token you want Shipday to send.
3. In Shipday → Dispatch → Settings → API & Webhooks, point the webhook at
   `https://<your-domain>/webhooks/shipday` and paste the same token in.

**Notes**

- The token is the *whole* of the webhook's authentication — Shipday sends it in
  a `token` header and signs nothing — so it is compared in constant time and an
  unverified body is never parsed. Treat it like a password.
- Shipday's own event spellings are matched verbatim, typo included:
  `ORDER_PIKEDUP`, not `ORDER_PICKED_UP`.
- Deliveries can arrive out of order, so an event older than the one already
  stored is acknowledged and dropped rather than applied. Without that, a
  retried `ORDER_ASSIGNED` would walk a finished delivery back to "unassigned".
- Money arrives as a major-unit decimal (`572.63`), unlike take.app's smallest
  unit — do not divide it by 100.
- `SHIPDAY_API_KEY` is optional and feeds only the driver-roster panel. **The key
  currently in `.env.local` is rejected by `api.shipday.com` with a 403**; a
  working key is `prefix.secret` shaped (e.g. `BgxsDwd00n.LNNn90QydrjgZ1K9dS13`),
  and can be copied from Dispatch → Settings → API. Everything else on the
  screen runs on the webhook alone and works without it.

## The till (POS)

Staff sign in at `/pos/login` with a staff ID and a PIN. The rail each person
sees is built from what their account may actually open, so a branch can put
eight people on the rota without making any of them a manager to grant one
screen.

**Access.** A role — cashier, manager, kitchen — sets the starting point; the
account can then be granted or refused anything by name in **admin → POS →
Staff**. An account left on "the role's usual access" stores `null` rather than
a copy of the defaults, so it keeps following the role if those ever change.
Every screen re-checks its permission on the server: the rail hiding a button is
a courtesy, not a lock.

**Shift close and day close are two different things**, on two screens.

| | Shift Close (`/pos/close`) | Day Close (`/pos/day-close`) |
| --- | --- | --- |
| When | A cashier finishes or hands over | End of the business day |
| Covers | That one shift's takings | Every shift, combined |
| Cash | The cashier counts their own drawer | The manager checks the day's totals |
| After it | The branch keeps trading | The next order starts a new business day |
| Who | Anyone with `shift_close` | A manager (`day_close`) |

The day's figures are summed from the shifts, never recounted from the orders,
so takings from both shifts appear in the daily total exactly once and a refund
next week cannot move a total that has already been reported. A day cannot be
closed while a shift is still open, and once it is closed nobody can open a
shift into it.

The trading day rolls over at 5am rather than midnight, so an evening shift that
runs to half past one belongs to the day it started on.

**Item Availability** (`/pos/availability`) is the branch's own stock switch:
switching a dish off takes it off the till and the kiosk and leaves the website
menu alone. That is deliberately not admin → Popular Items → `is_active`, which
means "we do not sell this" and would take the dish off the public site too.

**Website orders** reach the board as well as counter and kiosk ones. They come
from take.app into `takeapp_orders` rather than `bookings`, so the branch's
progress on one is kept in that table's `kitchen_status` — take.app owns
`order_status` and its webhook rewrites it on every event. A website order was
paid on the storefront and sits on nobody's shift, so the till offers no way to
take payment for one; doing that would put cash in the drawer that no day close
could account for.

**Setting it up.** Run these in the Supabase SQL editor, in this order. All are
safe to re-run.

1. `supabase/pos.sql` — staff, sessions, shifts
2. `supabase/pos_operations.sql` — settings, parked orders, expenses
3. `supabase/pos_permissions.sql` — per-account access
4. `supabase/pos_item_availability.sql` — the stock switch
5. `supabase/pos_business_days.sql` — the shift/day split
6. `supabase/pos_website_orders.sql` — website orders on the board
7. `supabase/order_notes.sql` — per-item and per-order customer notes
8. `supabase/pos_refunds.sql` — editing an order, refunds, kitchen approval
9. `supabase/order_prep_time.sql` — how long the kitchen took

**Amending an order.** It turns on one question, and the two answers behave
differently enough that treating them as one operation is what makes a till lose
track of its own takings.

- **Unpaid** — nothing has moved, so taking a dish off just makes the order
  smaller and the customer pays less.
- **Paid** — the charge stands. The line is marked cancelled inside the order and
  the difference is recorded as a refund, so a receipt printed at the counter and
  reprinted a month later agree, and the close shows a sale *and* a refund rather
  than a sale that quietly shrank.

A cancellation on a ticket the kitchen is still cooking is a **request**, not an
instruction: it appears on the board with Accept / Decline, and nothing is
refunded until the pass answers. Handing money back for a dish that turns out to
have been cooked and served is the one outcome worth designing against.

**Payment methods.** Cash, card and online are money arriving. Staff Food, Credit
and Pending are not, and each is kept out of net sales and drawer cash and named
on its own line at both closes — a staff meal is a cost, a credit is a debt, a
pending is a sale that has not happened yet.

**Notes**

- Anything in `lib/pos/permissions.ts` that *removes* capability is written as a
  restriction the account has to be given — `own_orders_only`, not `all_orders`.
  An account with an explicit list has exactly that list, so a key added later is
  absent from every account already set up by hand; phrase it as a grant and
  those accounts silently lose something the day it ships.
- Existing accounts keep working after `pos_permissions.sql`: `permissions` is
  `NULL` for all of them, which means "this role's defaults". An empty array
  means "nothing at all" and is a decision somebody made on purpose.
- The slow-changing lookups behind the till — the menu, the settings, the device
  and staff directory, the unclosed-shift check — are held for a few seconds per
  process in `lib/pos/cache.ts`. Anything that writes to them clears the entry
  outright, so an edit in admin reaches a live till on the next tap.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
