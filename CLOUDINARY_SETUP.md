# Cloudinary setup (image uploads)

This project now uploads product photos to Cloudinary using an unsigned upload preset.

## Config
Fill `cloudinary-config.js`:
- `cloudName`: your Cloudinary cloud name (already set to `deqwdzy5w`)
- `uploadPreset`: an **unsigned** upload preset name from Cloudinary

Important:
- Keep the API secret private. Do not put it in browser code.
- The browser only needs the cloud name and unsigned upload preset.

## Create an unsigned upload preset
1. Cloudinary Console -> Settings -> Upload -> Upload presets
2. Add upload preset
3. Signing mode: Unsigned
4. Allowed formats: images (and raw if needed)
5. Save

## Behavior
- If Cloudinary is configured, uploaded images are stored in Cloudinary and the product record stores the returned URL.
- Product records still use browser storage per device unless you add a shared database.
- If Cloudinary is not configured, photos are stored as local browser data URLs.
