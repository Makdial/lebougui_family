# Lebougui Family — Cloudflare Backend Setup Guide

Everything you need to know about the new Cloudflare-powered backend.

## Architecture

| Piece | What it is | URL / ID |
|---|---|---|
| **R2 bucket** | Stores ALL pictures & videos (shared across devices) | `lebouguifamily` — public at `https://pub-f7371d276e04458681ce5339f0789e7e.r2.dev` |
| **Upload Worker** | Stores uploaded media directly in R2 via the bucket binding (credentials stay server-side) | `https://shoemaker-r2-uploader.solitary-grass-8ad1.workers.dev` |
| **API Worker + D1** | Shared product catalog & orders database | `https://shoemaker-orders-api.solitary-grass-8ad1.workers.dev` |
| **D1 database** | `products`, `orders`, `order_items` tables | `shoemaker-db` |

All URLs are collected in **`api-config.js`** — the only file to change if you redeploy.

## Pages

- **`index.html`** — homepage + admin upload (admin password: same as before)
- **`all-shoes.html`** — full catalog with filters, detail view, zoom, 360° spin, color choice, cart, checkout
- **`admin-orders.html`** — orders dashboard (items, colors, sizes, quantities, totals, "mark done")

## Admin workflow

1. Open the site, unlock admin mode, click **Add New Creation**.
2. Pick the main photo, optionally pick **8–36 photos for the 360° spin**.
3. Add colors (one hex value per color, e.g. `#000000, #8b4513`).
4. The photo(s) upload to R2, the product is saved to D1 → **every user on every device sees it**.
5. Use **☁ Sync local to cloud** once if you have older shoes saved only in this browser.
6. Deleting a shoe removes it from the cloud catalog too.

## 360° view

- In the product detail modal, click the **360°** button (only appears if the shoe has frames).
- Then **drag left/right** or **scroll** to spin through the frames — a real frame-by-frame 360° spin.
- A slider bar is also shown for precise control.

## Orders & notifications

When a customer checks out, the order (with **size, color, model, quantity, price, address, notes**)
is stored in D1 and visible at **`admin-orders.html`**.

The API Worker then tries **all configured channels** (never blocking the customer):

| Channel | Status | How to activate |
|---|---|---|
| **Orders dashboard** | ✅ Works now | Open `/admin-orders.html` — no setup needed |
| **Discord webhook** (recommended) | Add a secret | In Discord: channel → Settings → Integrations → Webhooks → New Webhook → Copy URL, then:<br>`npx wrangler secret put WEBHOOK_URL` (paste the URL) in `shoemaker-orders-worker` |
| **Email (Resend)** | Needs API key | Sign up at [resend.com](https://resend.com) (free), create an API key, then:<br>`npx wrangler secret put RESEND_API_KEY` in `shoemaker-orders-worker` |
| **Phone push (ntfy)** | ⚠️ Works but rate-limited from Cloudflare IPs | Install the [ntfy app](https://ntfy.sh) (Android/iOS), add topic `lebougui-orders-a167c292`, and enable **instant delivery**. Worker retries 3× on 429. |

Run secret commands from `C:\Users\makhf\Downloads\shoemaker-orders-worker`.

## Going live (production domain)

CORS currently allows `http://localhost:8000` and `http://127.0.0.1:8000`.
When your site has a real domain, add it (comma-separated) to **both** workers:

```powershell
# from each worker folder (shoemaker-orders-worker AND shoemaker-r2-worker)
npx wrangler deploy --var EXTRA_ORIGINS:https://yourdomain.com
```

Or edit `EXTRA_ORIGINS` in each `wrangler.jsonc` and redeploy.

## Common commands

```powershell
# Redeploy a worker
Set-Location C:\Users\makhf\Downloads\shoemaker-orders-worker; npx wrangler deploy

# View live API logs (orders, notifications)
npx wrangler tail

# Query the database
npx wrangler d1 execute shoemaker-db --remote --command "SELECT * FROM orders ORDER BY created_at DESC"

# Start the site locally
python -m http.server 8000 --directory C:\Users\makhf\Downloads\Shoemaker-website
```

## i18n

All new pages and buttons are translated in **EN / FR / WO / ES / IT / DE** (`i18n.js`).
Adding a key: add it to every language block (German uses quoted keys: `"key": "..."`).
