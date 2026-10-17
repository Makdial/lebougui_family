# Deploy Shoemaker Website to Cloudflare Pages (Step-by-Step)

This is a static site (no build step required). 

## Step 1: Prepare the files to upload
You can upload directly as a ZIP, or connect via Git. Easiest is ZIP upload.

1. Zip the entire folder `Shoemaker-website/` (contains: index.html, all-shoes.html, styles.css, app.js, api-config.js, etc.)
2. Keep the structure as-is (files at root level).

## Step 2: Create a Cloudflare Pages project
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to `Workers & Pages` → `Create application` → `Pages`
3. Choose `Upload assets` (or `Connect to Git` if you push this repo to GitHub/GitLab)
4. Project name: `lebougui-family` (or any name you prefer)

## Step 3: Upload and deploy
1. If using Upload assets: click `Upload zip` and select your zipped `Shoemaker-website` folder
2. Framework preset: `None`
3. Build command: leave empty
4. Build output directory: `/` (root)
5. Click `Deploy`

Wait for it to finish. You'll get a URL like: `https://lebougui-family.pages.dev`

## Step 4: Test the deployment
1. Open the `.pages.dev` URL
2. Test key pages:
   - Home: `/index.html` (or just root)
   - All shoes: `/all-shoes.html`
   - Admin: unlock with password `$$Senegal1960` and try uploading/syncing
   - Cart & checkout (should call existing Worker endpoints)

Note: Your backend is already live on Workers (`shoemaker-orders-api.*`, `shoemaker-r2-uploader.*`). `api-config.js` points to those, so they should work as-is.

## Step 5: Add custom domain (lebouguifamily.com)
1. In the Pages project, go to `Custom domains` → `Add a custom domain`
2. Enter: `lebouguifamily.com`
3. If you also want www: add `www.lebouguifamily.com`
4. If your domain is already on Cloudflare nameservers: Cloudflare will automatically create the required DNS records (CNAME/AAAA or flattening as appropriate). Click Continue.
5. If your domain is on another registrar (GoDaddy, Namecheap, etc.): Cloudflare will show the exact DNS record to add there. Add it, then return and continue.
6. HTTPS is issued automatically via Let's Encrypt.

## DNS notes (if adding manually at registrar)
- For apex (`lebouguifamily.com`): usually a CNAME to the Pages domain OR use CNAME flattening if A record not advised. With Cloudflare Pages, the UI shows the correct target when "domain not on Cloudflare" is detected.
- For `www`: CNAME to `lebougui-family.pages.dev` (replace with your actual project slug).

## Troubleshooting tips
- If assets don't load (404s), confirm Build output directory is `/` and files are in root of zip.
- If uploads/orders fail, check browser console for CORS/network. Your existing Workers allow the Pages domain once custom domain is set? If testing on `.pages.dev` first, that should work if CORS allows it (Workers already configured for the production domain, but `.pages.dev` may need to be allowed). Try after adding custom domain if you hit CORS.
- Images from R2 (`pub-f7371d276e04458681ce5339f0789e7e.r2.dev`) should load fine.

## Done
Once DNS propagates (usually 1-10 minutes if proxied via Cloudflare, or up to a few hours elsewhere), your site will be live at `https://lebouguifamily.com`.
