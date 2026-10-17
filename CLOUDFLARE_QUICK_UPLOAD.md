# Quick: Upload to Cloudflare Pages (no Git)

1. Zip the `Shoemaker-website` folder.
2. Go to [dash.cloudflare.com](https://dash.cloudflare.com/) → Workers & Pages → Create → Pages.
3. Upload assets → Select zip.
4. Project name: `lebougui-family`.
5. Framework: None. Build command: empty. Output dir: `/`.
6. Deploy. Done. Get `*.pages.dev` URL.
7. Add custom domain: `lebouguifamily.com` (and `www` if desired). If domain already on Cloudflare, DNS auto-configures; else add the given CNAME/A record at your registrar.
