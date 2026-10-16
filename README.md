# Lebougui Family — Shoemaker Website

Built for Lebougui Family shoemaker studio. Showcases custom shoes, boots, and leather goods with shared Cloudflare backend and a public catalog.

## What you get

- **Shared catalog** — all shoes uploaded by admin are visible to all users on all devices.
- **All Shoes page** — browse everything with filters; click any shoe to see details, zoom/pan, 360° frame spin, pick color, choose size/model/qty, add to cart or buy now.
- **Multi-item cart** — save multiple items in `localStorage` and checkout in one go.
- **Orders** — placed orders are stored in Cloudflare D1; email/webhook/ntfy notifications can be configured; admin dashboard to view/manage orders.
- **Admin upload** — drag/drop main image, optional multi-frame 360°, colors. Images go to Cloudflare R2.
- **Multi-language** — EN, FR, WO, ES, IT, DE.

## Quick start (local)

```bash
cd "C:\Users\makhf\Downloads\Shoemaker-website"
python -m http.server 8000 --directory .
# open http://localhost:8000/
```

## Key pages

- `/index.html` — home + admin area
- `/all-shoes.html` — all products, filters, detail, cart, checkout
- `/admin-orders.html` — orders dashboard

## Backend (already set up)

- **R2**: `lebouguifamily` — public `https://pub-f7371d276e04458681ce5339f0789e7e.r2.dev`
- **R2 Uploader Worker**: presigned uploads at `https://shoemaker-r2-uploader.solitary-grass-8ad1.workers.dev`
- **Orders/API Worker + D1**: catalog/orders at `https://shoemaker-orders-api.solitary-grass-8ad1.workers.dev`

All endpoints are in `api-config.js`.

## Features in detail

- **Filters** — All / Shoes (furniture) / Boots (doors) / Leather Goods (decor)
- **Colors** — pick per shoe before adding to cart
- **360°** — frame-by-frame spin (drag/scroll/slider); only if frames exist
- **Cart** — floating cart button shows count; modal to edit/remove; totals in FCFA
- **Checkout** — name, phone, email, address, notes; posts to `/api/orders`
- **Admin** — admin password unlocks upload, sync, orders link
- **Notifications** — webhook/email/ntfy configurable via Cloudflare secrets

## Admin password

`$$Senegal1960`

## More info

See `SETUP_GUIDE.md` for production CORS, secrets setup (Resend/webhook/ntfy), and commands.

## Status

Everything is live and tested against the deployed Workers.