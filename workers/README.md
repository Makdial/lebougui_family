# Cloudflare Workers (backend)

Source of truth for the two Workers that power the site. They are deployed
separately from the static frontend.

| Worker | Local folder | URL | Purpose |
| --- | --- | --- | --- |
| `shoemaker-r2-uploader` | `workers/shoemaker-r2-uploader` | `https://shoemaker-r2-uploader.solitary-grass-8ad1.workers.dev` | Direct image/video uploads to the R2 bucket `lebouguifamily` (`POST /api/upload`) |
| `shoemaker-orders-api` | `workers/shoemaker-orders-api` | `https://shoemaker-orders-api.solitary-grass-8ad1.workers.dev` | Shared product catalog (`/api/products`) + orders (`/api/orders`) on D1 |

## CORS

Browsers block the upload/catalog requests unless the Worker echoes back the
requesting origin. Both Workers allow:

- `http://localhost:8000` and `http://127.0.0.1:8000` (local development)
- `https://lebouguifamily.com` and `https://www.lebouguifamily.com`
- `https://lebougui-family.pages.dev` (and any `*.pages.dev` preview deployment)

Extra origins can be added without touching the code by setting the
`EXTRA_ORIGINS` variable (comma-separated) in `wrangler.jsonc`, e.g.:

```jsonc
"vars": { "EXTRA_ORIGINS": "https://staging.example.com" }
```

## Deploy

```bash
cd workers/shoemaker-r2-uploader
npx wrangler deploy

cd ../shoemaker-orders-api
npx wrangler deploy
```

Requires a Cloudflare login (`npx wrangler login`) on an account with access to
the Workers listed above.

## Notes

- `shoemaker-orders-api/schema.sql` holds the D1 schema (`products`, `orders`,
  `order_items`).
- `images_360` and `colors` are normalized to JSON arrays on write, so records
  saved by older clients (which sent double-encoded strings such as `"[]"`) are
  cleaned up automatically.
- Secrets (`RESEND_API_KEY`, `WEBHOOK_URL`, `NTFY_*`) are set with
  `npx wrangler secret put <NAME>` and are never stored in this repo.
