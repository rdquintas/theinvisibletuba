// Netlify Function: cria a sessão Stripe Checkout do carrinho e devolve o URL da página de pagamento
// do Stripe, para onde o browser é enviado (assets/scripts/zrq-cart.js faz POST para /api/create-checkout-session).
//
// Os preços vêm sempre do dados/artigos_loja.yaml publicado no site (o mesmo que o carrinho usa):
// o browser só manda id + quantidade, por isso um pedido alterado nunca compra abaixo do preço real.
//
// Variáveis de ambiente (Netlify > Site configuration > Environment variables):
//   STRIPE_SECRET_KEY  chave secreta do Stripe (sk_test_... em testes, sk_live_... em produção)

import yaml from "js-yaml";

const MAX_QTY = 99; // o mesmo limite do carrinho (zrq-cart.js)

const reply = (status, body) => Response.json(body, { status });

export default async (req) => {
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return reply(500, { error: "Stripe is not configured yet." });

  let body = null;
  try {
    body = await req.json();
  } catch (e) {
    // corpo inválido: tratado em baixo
  }
  if (!body || !Array.isArray(body.items) || !body.items.length) return reply(400, { error: "Invalid cart" });

  const lang = body.lang === "en" ? "en" : "pt";
  // o próprio site (produção ou deploy preview), para ler o catálogo e montar os links de volta
  const origin = new URL(req.url).origin;

  // o mesmo catálogo que a loja usa no browser
  let catalog;
  try {
    const res = await fetch(`${origin}/dados/artigos_loja.yaml`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    catalog = yaml.load(await res.text());
  } catch (e) {
    return reply(500, { error: "Shop catalog could not be read." });
  }
  if (!catalog || typeof catalog !== "object") return reply(500, { error: "Shop catalog could not be read." });

  // IVA e portes: os mesmos valores que o carrinho mostra (zrq-cart.js)
  const ivaRate = (Number(catalog.loja_iva) || 0) / 100;
  const portesCents = Math.round((Number(catalog.loja_portes) || 0) * 100);
  const currency = String(catalog.currency || "eur").toLowerCase();
  const productsById = {};
  (catalog.products || []).forEach((p) => (productsById[p.id] = p));

  const fields = new URLSearchParams({
    mode: "payment",
    success_url: `${origin}/checkout/success.html?session_id={CHECKOUT_SESSION_ID}&lang=${lang}`,
    cancel_url: `${origin}/checkout/cancel.html?lang=${lang}`,
    // envios só para Portugal (continente e ilhas), como diz o carrinho
    "shipping_address_collection[allowed_countries][0]": "PT",
    "phone_number_collection[enabled]": "true",
  });
  if (portesCents > 0) {
    const rate = "shipping_options[0][shipping_rate_data]";
    fields.append(`${rate}[type]`, "fixed_amount");
    fields.append(`${rate}[fixed_amount][amount]`, String(portesCents));
    fields.append(`${rate}[fixed_amount][currency]`, currency);
    fields.append(`${rate}[display_name]`, lang === "en" ? "Shipping (CTT)" : "Portes de envio (CTT)");
  }

  let line = 0;
  body.items.forEach((item) => {
    const id = item && item.id != null ? String(item.id) : null;
    const product = id !== null && Object.prototype.hasOwnProperty.call(productsById, id) ? productsById[id] : null;
    if (!product) return;
    const qty = Math.min(MAX_QTY, Math.max(1, parseInt(item.qty, 10) || 1));
    const text = product[lang] || product.pt || {};
    const prefix = `line_items[${line}]`;
    fields.append(`${prefix}[quantity]`, String(qty));
    fields.append(`${prefix}[price_data][currency]`, currency);
    // preço unitário com IVA, arredondado ao cêntimo (igual ao carrinho)
    fields.append(`${prefix}[price_data][unit_amount]`, String(Math.round(Number(product.price) * 100 * (1 + ivaRate))));
    fields.append(`${prefix}[price_data][product_data][name]`, text.title || product.id);
    const image = product.images && product.images[0];
    if (image) {
      const url = /^https?:\/\//i.test(image) ? image : `${origin}/${String(image).replace(/^\/+/, "")}`;
      fields.append(`${prefix}[price_data][product_data][images][0]`, url);
    }
    line++;
  });
  if (!line) return reply(400, { error: "Cart is empty or contains invalid items" });

  let res;
  let session;
  try {
    res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: fields,
      signal: AbortSignal.timeout(15000),
    });
    session = await res.json();
  } catch (e) {
    return reply(502, { error: `Could not reach Stripe: ${e.message}` });
  }

  if (res.ok && session && session.url) return reply(200, { url: session.url });
  return reply(502, { error: (session && session.error && session.error.message) || "Stripe error" });
};

export const config = {
  path: "/api/create-checkout-session",
};
