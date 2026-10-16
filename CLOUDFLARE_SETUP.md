# Cloudflare Pages setup

1. Add your domain `lebouguifamily.com` to Cloudflare (change nameservers at your registrar to Cloudflare's).
2. In Cloudflare Dashboard -> Workers & Pages -> Create application -> Pages -> Connect to Git.
3. Select repository `Makdial/lebougui_family`, branch `main`.
4. Build settings:
   - Framework preset: None
   - Build command: (empty)
   - Build output directory: `/`
5. Deploy. Cloudflare will serve the static files.
6. Custom domain: in the Pages project -> Custom domains -> Add `lebouguifamily.com` (and `www` if desired). Cloudflare configures DNS automatically if the domain is on Cloudflare.
7. HTTPS is automatic.
