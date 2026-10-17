const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  // Production front-ends (Cloudflare Pages + custom domain)
  "https://lebouguifamily.com",
  "https://www.lebouguifamily.com",
  "https://lebougui-family.pages.dev",
];

function allowedOrigins(env) {
  const extra = (env && env.EXTRA_ORIGINS) ? String(env.EXTRA_ORIGINS).split(",").map(s => s.trim()).filter(Boolean) : [];
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
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

// colors / images_360 can arrive as an array, a JSON string or a double-encoded
// JSON string (older clients). Always store a clean JSON array.
function normalizeArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
      if (typeof parsed === "string") return normalizeArray(parsed);
    } catch (e) { return []; }
  }
  return [];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Discord / Slack-compatible webhook (set WEBHOOK_URL secret)
async function sendWebhook(env, title, message) {
  if (!env.WEBHOOK_URL) return false;
  try {
    const isDiscord = /discord(app)?\.com\/api\/webhooks/.test(env.WEBHOOK_URL);
    const payload = isDiscord
      ? { content: `**${title}**\n${message}` }
      : { title, message, text: `${title}\n${message}`, content: `**${title}**\n${message}` };
    const res = await fetch(env.WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    console.log("webhook status:", res.status);
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
}

async function sendPush(env, title, message) {
  if (!env.NTFY_TOPIC) return false;
  const base = env.NTFY_SERVER || "https://ntfy.sh";
  // ntfy.sh can rate-limit shared IPs (429): retry with delays
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await sleep(15000 * attempt);
      const res = await fetch(base + "/" + env.NTFY_TOPIC, {
        method: "POST",
        headers: {
          "Title": title,
          "Priority": "high",
          "Tags": "shopping_cart"
        },
        body: message
      });
      console.log("ntfy push attempt", attempt, "status:", res.status);
      if (res.ok) return true;
      if (res.status !== 429) return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
  return false;
}

async function sendEmail(env, subject, body) {
  if (!env.ADMIN_EMAIL) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL || "no-reply@example.com",
        to: env.ADMIN_EMAIL,
        subject,
        html: body,
        text: body.replace(/<[^>]+>/g, '')
      })
    });
    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin, env) });
    }

    // Products endpoints
    if (url.pathname === "/api/products" && request.method === "GET") {
      const { results } = await env.DB.prepare("SELECT * FROM products ORDER BY datetime(created_at) DESC").all();
      return new Response(JSON.stringify(results || []), {
        headers: { "Content-Type": "application/json", ...corsHeaders(origin, env) }
      });
    }

    if (url.pathname === "/api/products" && request.method === "POST") {
      try {
        const body = await request.json();
        const { id, name, category, price, desc, image, colors, images_360, has_360 } = body;
        const now = new Date().toISOString();
        await env.DB.prepare(
          "INSERT OR REPLACE INTO products (id, name, category, price, desc, image, colors, images_360, has_360, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
          id,
          name,
          category,
          price || '',
          desc || '',
          image,
          colors ? JSON.stringify(normalizeArray(colors)) : '[]',
          images_360 ? JSON.stringify(normalizeArray(images_360)) : '[]',
          has_360 ? 1 : 0,
          now,
          now
        ).run();
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders(origin, env) }
        });
      } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "failed" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders(origin, env) } });
      }
    }

    if (url.pathname.startsWith("/api/products/") && request.method === "DELETE") {
      const id = url.pathname.split("/").pop();
      await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders(origin, env) }
      });
    }

    // Orders endpoints
    if (url.pathname === "/api/orders" && request.method === "POST") {
      try {
        const body = await request.json();
        const { order, items, customer } = body;
        const now = new Date().toISOString();
        await env.DB.prepare(
          "INSERT INTO orders (id, customer_name, customer_phone, customer_email, notes, total, status, created_at, source, address) VALUES (?, ?, ?, ?, ?, ?, 'new', ?, 'web', ?)"
        ).bind(
          order.id,
          customer?.name || '',
          customer?.phone || '',
          customer?.email || '',
          order.notes || '',
          order.total || '',
          now,
          customer?.address || order.address || ''
        ).run();

        for (const item of items || []) {
          await env.DB.prepare(
            "INSERT INTO order_items (order_id, product_id, product_name, product_image, color, size, qty, price, model) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
          ).bind(
            order.id,
            item.product_id,
            item.product_name,
            item.product_image,
            item.color || '',
            item.size || '',
            item.qty || 1,
            item.price || '',
            item.model || ''
          ).run();
        }

        // Notifications must never block or fail the order
        if (ctx && ctx.waitUntil) {
          ctx.waitUntil((async () => {
            try {
              let itemsHtml = '<table border="1" cellpadding="5" style="border-collapse:collapse"><tr><th>Product</th><th>Color</th><th>Size</th><th>Qty</th><th>Price</th></tr>';
              for (const item of items || []) {
                itemsHtml += `<tr><td>${item.product_name}</td><td>${item.color||''}</td><td>${item.size||''}</td><td>${item.qty}</td><td>${item.price||''}</td></tr>`;
              }
              itemsHtml += `</table><p><strong>Total:</strong> ${order.total||''}</p><p><strong>Customer:</strong> ${customer?.name||''} | ${customer?.phone||''} | ${customer?.email||''}</p><p><strong>Address:</strong> ${customer?.address||''}</p><p><strong>Notes:</strong> ${order.notes||''}</p>`;

              const itemLines = (items || []).map(i => `- ${i.product_name} | ${i.color||''} | size ${i.size||''} | x${i.qty||1}`).join("\n");
              const pushMsg = `${customer?.name||'Customer'} (${customer?.phone||''})\n${itemLines}\nTotal: ${order.total||''}`;

              await Promise.allSettled([
                Promise.race([sendEmail(env, `New Order: ${order.id}`, itemsHtml), sleep(8000)]),
                Promise.race([sendWebhook(env, `New order ${order.total||''}`, pushMsg), sleep(8000)]),
                // ntfy retries run in background; don't hold the response
                (async () => { try { await sendPush(env, `New order ${order.total||''}`, pushMsg); } catch(e){} })()
              ]);
            } catch (e) { console.error("notify failed", e); }
          })());
        }

        return new Response(JSON.stringify({ success: true, orderId: order.id }), {
          headers: { "Content-Type": "application/json", ...corsHeaders(origin, env) }
        });
      } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "failed" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders(origin, env) } });
      }
    }

    if (url.pathname === "/api/orders" && request.method === "GET") {
      const { results: orders } = await env.DB.prepare("SELECT * FROM orders ORDER BY datetime(created_at) DESC").all();
      const list = orders || [];
      for (const o of list) {
        const { results: items } = await env.DB.prepare("SELECT * FROM order_items WHERE order_id = ?").bind(o.id).all();
        o.items = items || [];
      }
      return new Response(JSON.stringify(list), {
        headers: { "Content-Type": "application/json", ...corsHeaders(origin, env) }
      });
    }

    if (url.pathname.startsWith("/api/orders/") && request.method === "PUT") {
      const id = url.pathname.split("/").pop();
      const body = await request.json().catch(() => ({}));
      await env.DB.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(body.status || "done", id).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders(origin, env) }
      });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders(origin, env) });
  }
};