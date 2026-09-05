// stripe.js
// Thin wrapper around the Stripe SDK for creating a one-time checkout session
// per (chatId, offer) pair, retrieving a session's details, and verifying
// webhook signatures.

const Stripe = require("stripe");
const logger = require("./utils/logger");

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!STRIPE_SECRET_KEY) {
  logger.warn("STRIPE_SECRET_KEY is not set — API calls will fail until it is configured.");
}
if (!STRIPE_WEBHOOK_SECRET) {
  logger.warn("STRIPE_WEBHOOK_SECRET is not set — webhook verification will fail until it is configured.");
}

const stripe = Stripe(STRIPE_SECRET_KEY || "sk_test_placeholder", {
  timeout: 20000,
  maxNetworkRetries: 3,
});

/**
 * Retrieves a Checkout Session by ID — used by the /download page to verify
 * payment before revealing the file, since Payment Links redirect with
 * ?session_id={CHECKOUT_SESSION_ID} after completion.
 */
async function retrieveSession(sessionId) {
  return stripe.checkout.sessions.retrieve(sessionId);
}

/**
 * Verifies and parses a webhook event from the raw request body + signature
 * header. Must be called with the RAW (unparsed) body.
 */
function constructWebhookEvent(rawBody, signatureHeader) {
  return stripe.webhooks.constructEvent(rawBody, signatureHeader, STRIPE_WEBHOOK_SECRET);
}

module.exports = { retrieveSession, constructWebhookEvent };
