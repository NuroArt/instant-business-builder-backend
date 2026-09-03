// stripe.js
// Thin wrapper around the Stripe SDK for creating a one-time checkout session
// per (chatId, offer) pair, and verifying webhook signatures. Same pattern
// used in the Instant Landing Page project — see that repo's stripe.js for
// the original version this is adapted from.

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

const stripe = Stripe(STRIPE_SECRET_KEY || "sk_test_placeholder");

/**
 * Creates a one-time Checkout Session for a specific buyer (identified by
 * their Telegram chatId) purchasing a specific offer. Both travel in
 * session metadata, so the webhook can identify who to deliver the file to.
 * @param {object} params
 * @param {number|string} params.chatId
 * @param {string} params.slug - offer slug, e.g. "content"
 * @param {object} params.offer - the offer object from utils/offers.js
 * @param {string} params.publicUrl - e.g. https://your-bot.onrender.com
 */
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

/**
 * Verifies and parses a webhook event from the raw request body + signature
 * header. Must be called with the RAW (unparsed) body — see index.js, which
 * uses express.raw() specifically for the webhook route.
 */
function constructWebhookEvent(rawBody, signatureHeader) {
  return stripe.webhooks.constructEvent(rawBody, signatureHeader, STRIPE_WEBHOOK_SECRET);
}

module.exports = { createCheckoutSession, constructWebhookEvent };
