// stripe.js
// Thin wrapper around the Stripe SDK for creating a one-time checkout session
// per (chatId, offer) pair, and verifying webhook signatures.

const Stripe = require("stripe");
const logger = require("./utils/logger");

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!STRIPE_SECRET_KEY) {
  logger.warn("STRIPE_SECRET_KEY is not set — checkout will fail until it is configured.");
}
if (!STRIPE_WEBHOOK_SECRET) {
  logger.warn("STRIPE_WEBHOOK_SECRET is not set — webhook verification will fail until it is configured.");
}

// Explicit timeout + retry settings — added while diagnosing a persistent
// StripeConnectionError on this service. A longer timeout and more retries
// help distinguish a marginal/intermittent connection (which this fixes)
// from a fully blocked one (which it won't).
const stripe = Stripe(STRIPE_SECRET_KEY || "sk_test_placeholder", {
  timeout: 20000,
  maxNetworkRetries: 3,
});

async function createCheckoutSession({ chatId, slug, offer, publicUrl }) {
  const base = publicUrl.replace(/\/$/, "");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${offer.name} — Instant Business Builder`,
            description: offer.tagline,
          },
          unit_amount: offer.priceCents,
        },
        quantity: 1,
      },
    ],
    metadata: { chatId: String(chatId), slug },
    success_url: `${base}/thank-you.html`,
    cancel_url: `${base}/purchase-cancelled.html`,
  });

  return session;
}

function constructWebhookEvent(rawBody, signatureHeader) {
  return stripe.webhooks.constructEvent(rawBody, signatureHeader, STRIPE_WEBHOOK_SECRET);
}

module.exports = { createCheckoutSession, constructWebhookEvent };
