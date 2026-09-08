// handlers/salespack.js
// Handles the /salespack command and its follow-up free-text business/offer
// description.
//
// Follows the same pattern as handlers/landingpage.js rather than the four
// fixed premium packs: content is generated per-request from Claude, so
// there's no fixed Stripe Payment Link/slug to look up ahead of time. Each
// generation gets a random ID embedded in the payment reference as
// "salespack-<id>" (Stripe client_reference_id or Stars invoice payload) —
// index.js recognizes that prefix and routes to markPaidAndDeliver() here
// instead of the fixed-offer lookup used for the four packs.
//
// Unlike the landing page (which delivers a downloadable HTML file), the
// Sales & Offer Pack is delivered as formatted Telegram messages directly,
// same as a /build kit — so there's no preview/download webpage route, just
// a short free teaser message sent immediately, with the full content sent
// via telegram.sendMessage once payment is confirmed.
//
// Generated packs are held in memory only, same accepted limitation as
// landing pages — if this service restarts between generating a preview
// and completing payment, that generation is lost and the person needs to
// run /salespack again, which is fast and free to redo.
 
const crypto = require("crypto");
const telegram = require("../telegram");
const claude = require("../claude");
const logger = require("../utils/logger");
const { header, esc, formatSalesOfferPack, formatSalesPackPreview } = require("../utils/formatOutput");
 
const sessionState = new Map(); // chatId -> "awaiting_description" | "generating"
const generations = new Map(); // generationId -> { chatId, pack, paid }
 
const SALES_PACK_SLUG_PREFIX = "salespack-";
const SALES_PACK_PRICE = "$19";
const SALES_PACK_STARS = 850;
const SALES_PACK_LINK = process.env.STRIPE_LINK_SALESPACK;
 
function isAwaitingDescription(chatId) {
  return sessionState.get(chatId) === "awaiting_description";
}
 
function clearSession(chatId) {
  sessionState.delete(chatId);
}
 
async function handleSalesPack(chatId) {
  sessionState.set(chatId, "awaiting_description");
  const message = [
    header("Let's Build Your Sales & Offer Pack"),
    esc(
      "Describe your business or offer, and I'll generate a complete offer breakdown, sales page copy, launch email sequence, and upsell/downsell logic."
    ),
    esc(
      'Example: "a $149 video course teaching beginners how to start a side hustle" or "a local dog grooming service, $60 per session"'
    ),
  ].join("\n\n");
  await telegram.sendMessage(chatId, message);
}
 
async function handleDescriptionInput(chatId, description) {
  const trimmed = (description || "").trim();
 
  if (trimmed.length < 5) {
    await telegram.sendMessage(
      chatId,
      esc("Tell me a bit more about the business or offer so I can write something specific to it.")
    );
    return;
  }
 
  sessionState.set(chatId, "generating");
  await telegram.sendMessage(
    chatId,
    `${header("Generating Your Sales & Offer Pack")}\n\n${esc("This usually takes about a minute...")}`
  );
  await telegram.sendTyping(chatId);
 
  try {
    const pack = await claude.generateSalesOfferPack(trimmed);
 
    const generationId = crypto.randomBytes(8).toString("hex");
    generations.set(generationId, { chatId, pack, paid: false });
 
    const slug = `${SALES_PACK_SLUG_PREFIX}${generationId}`;
 
    const buttons = [];
    if (SALES_PACK_LINK) {
      const checkoutUrl = `${SALES_PACK_LINK}?client_reference_id=${chatId}_${slug}`;
      buttons.push([{ text: `Buy Now — ${SALES_PACK_PRICE}`, url: checkoutUrl }]);
    } else {
      logger.warn("STRIPE_LINK_SALESPACK is not set — only the Stars option will be offered", { chatId });
    }
    buttons.push([{ text: `⭐ Pay with ${SALES_PACK_STARS} Stars`, callback_data: `buystars:${slug}` }]);
 
    const previewMessage = formatSalesPackPreview(pack);
    await telegram.sendMessageWithButtons(chatId, previewMessage, buttons);
    sessionState.delete(chatId);
  } catch (err) {
    logger.error("Sales & Offer Pack generation failed", { chatId, error: err.message });
    sessionState.delete(chatId);
    const userMessage =
      err.message === "BUSINESS_KIT_PARSE_ERROR"
        ? "I generated your pack but hit a formatting error putting it together. Please try /salespack again."
        : "Something went wrong generating your Sales & Offer Pack. Please try /salespack again in a moment.";
    await telegram.sendMessage(chatId, esc(userMessage));
  }
}
 
function getGeneration(generationId) {
  return generations.get(generationId) || null;
}
 
/**
 * Called by index.js once a Sales & Offer Pack purchase (Stripe or Stars)
 * completes. Marks the generation paid AND delivers the full content
 * directly via Telegram messages, since there's no file/webpage to serve —
 * mirrors how handlers/build.js delivers a kit, just gated behind payment.
 */
async function markPaidAndDeliver(generationId) {
  const gen = generations.get(generationId);
  if (!gen) return null;
 
  gen.paid = true;
 
  try {
    const messages = formatSalesOfferPack(gen.pack);
    for (const msg of messages) {
      await telegram.sendMessage(gen.chatId, msg);
      await telegram.sendTyping(gen.chatId);
    }
    await telegram.sendMessage(gen.chatId, esc("Your Sales & Offer Pack is complete — thanks for your purchase!"));
  } catch (err) {
    logger.error("Failed to deliver Sales & Offer Pack via Telegram", {
      chatId: gen.chatId,
      generationId,
      error: err.message,
    });
  }
 
  return gen;
}
 
module.exports = {
  handleSalesPack,
  handleDescriptionInput,
  isAwaitingDescription,
  clearSession,
  getGeneration,
  markPaidAndDeliver,
  SALES_PACK_SLUG_PREFIX,
};
