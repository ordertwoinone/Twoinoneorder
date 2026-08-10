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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
