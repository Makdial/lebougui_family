const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  // Production front-ends (Cloudflare Pages + custom domain)
  "https://lebouguifamily.com",
  "https://www.lebouguifamily.com",
  "https://lebougui-family.pages.dev",
];

const PUBLIC_BASE = "https://pub-f7371d276e04458681ce5339f0789e7e.r2.dev";

function allowedOrigins(env) {
  const extra = (env && env.EXTRA_ORIGINS)
    ? String(env.EXTRA_ORIGINS).split(",").map(s => s.trim()).filter(Boolean)
    : [];
  return DEFAULT_ALLOWED_ORIGINS.concat(extra);
}

function corsHeaders(origin, env) {
  const list = allowedOrigins(env);
  // Allow extra Cloudflare Pages preview deployments (*.pages.dev) automatically.
  let allow = list.includes(origin) ? origin : "";
  if (!allow && /^https:\/\/[a-z0-9.-]+\.pages\.dev$/.test(origin)) allow = origin;
  if (!allow) allow = list[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, origin, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin, env) },
  });
}

function getExtension(filename, contentType) {
  if (filename && filename.includes(".")) {
    const ext = filename.split(".").pop().toLowerCase();
    if (ext) return ext;
  }
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  if (contentType === "image/avif") return "avif";
  if (contentType === "video/mp4") return "mp4";
  if (contentType === "video/webm") return "webm";
  if (contentType === "video/quicktime") return "mov";
  return "bin";
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin, env) });
    }

    // Direct upload: raw bytes in the request body.
    // POST /api/upload?filename=foo.jpg&contentType=image/jpeg&folder=products
    if (request.method === "POST" && url.pathname === "/api/upload") {
      try {
        const filename = url.searchParams.get("filename") || "upload.bin";
        const contentType = url.searchParams.get("contentType") || "application/octet-stream";
        const folder = (url.searchParams.get("folder") || "products").replace(/^\/+|\/+$/g, "");

        if (!request.body) return json({ error: "empty_body" }, 400, origin, env);

        const ext = getExtension(filename, contentType);
        const key = `${folder}/${Date.now()}_${crypto.randomUUID()}.${ext}`;

        const obj = await env.MEDIA.put(key, request.body, {
          httpMetadata: { contentType },
        });

        return json({
          success: true,
          key,
          size: obj && obj.size,
          publicUrl: `${PUBLIC_BASE}/${key}`,
        }, 200, origin, env);
      } catch (err) {
        console.error("upload failed:", err && err.stack || err);
        return json({ error: "upload_failed", detail: String(err && err.message || err) }, 500, origin, env);
      }
    }

    // Legacy presign endpoint: R2 bindings cannot create presigned URLs.
    if (request.method === "POST" && url.pathname === "/api/presign") {
      return json({
        error: "presign_unsupported",
        message: "Use POST /api/upload?filename=...&contentType=...&folder=... with the raw file as the body.",
      }, 501, origin, env);
    }

    return new Response("Not found", { status: 404, headers: corsHeaders(origin, env) });
  },
};
