// handlers/landingpage.js
// Handles the /landingpage command and its follow-up free-text description.
//
// Unlike the four fixed premium packs (which each map to one static file),
// every landing page is uniquely generated per request, so there's no fixed
// Stripe Payment Link or slug to look up ahead of time. Instead, each
// generation gets a random ID, and that ID gets embedded directly into the
// payment reference (Stripe's client_reference_id / the Stars invoice
// payload) as "landingpage-<id>" — index.js recognizes that prefix and
// routes to markPaid()/getGeneration() here instead of the fixed-offer
// lookup used for the packs.
//
// Generated pages are held in memory only, same simplification the original
// standalone L-page-gen web app used — if this service restarts between
// someone generating a preview and completing payment, that specific
// generation is lost (the preview link 404s, and if payment somehow still
// completes, delivery fails). This is a known, accepted limitation, not an
// oversight — regenerating is fast and free for the person to redo.

const crypto = require("crypto");
const telegram = require("../telegram");
const logger = require("../utils/logger");
const { header, esc } = require("../utils/formatOutput");
const { generateLandingPage, splitLandingPageHtml } = require("../claude-landingpage");
const { buildPreviewDocument, buildFullDocument } = require("../pageBuilder");

const sessionState = new Map(); // chatId -> "awaiting_description" | "generating"
const generations = new Map(); // generationId -> { chatId, fullHtml, previewHtml, paid }

const LANDING_PAGE_SLUG_PREFIX = "landingpage-";
const LANDING_PAGE_PRICE = "$19";
const LANDING_PAGE_STARS = 850;
const LANDING_PAGE_LINK = process.env.STRIPE_LINK_LANDINGPAGE;

function isAwaitingDescription(chatId) {
  return sessionState.get(chatId) === "awaiting_description";
}

function clearSession(chatId) {
  sessionState.delete(chatId);
}

async function handleLandingPage(chatId) {
  sessionState.set(chatId, "awaiting_description");
  const message = [
    header("Let's Build Your Landing Page"),
    esc("Describe your business or offer, and I'll generate a complete, ready-to-publish landing page."),
    esc('Example: "a mobile car detailing service in Austin" or "an online course teaching beginner watercolor painting"'),
  ].join("\n\n");
  await telegram.sendMessage(chatId, message);
}

async function handleDescriptionInput(chatId, description) {
  const trimmed = (description || "").trim();

  if (trimmed.length < 5) {
    await telegram.sendMessage(
      chatId,
      esc("Tell me a bit more about the business so I can write something specific to it.")
    );
    return;
  }

  sessionState.set(chatId, "generating");
  await telegram.sendMessage(
    chatId,
    `${header("Generating Your Landing Page")}\n\n${esc("This usually takes about a minute...")}`
  );
  await telegram.sendTyping(chatId);

  try {
    const rawHtml = await generateLandingPage(trimmed);
    const parts = splitLandingPageHtml(rawHtml);

    const previewHtml = buildPreviewDocument(parts);
    const fullHtml = buildFullDocument(parts);

    const generationId = crypto.randomBytes(8).toString("hex");
    generations.set(generationId, { chatId, fullHtml, previewHtml, paid: false });

    const publicUrl = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
    const previewUrl = `${publicUrl}/landingpage-preview/${generationId}`;
    const slug = `${LANDING_PAGE_SLUG_PREFIX}${generationId}`;

    const buttons = [];
    if (LANDING_PAGE_LINK) {
      const checkoutUrl = `${LANDING_PAGE_LINK}?client_reference_id=${chatId}_${slug}`;
      buttons.push([{ text: `Buy Now — ${LANDING_PAGE_PRICE}`, url: checkoutUrl }]);
    } else {
      logger.warn("STRIPE_LINK_LANDINGPAGE is not set — only the Stars option will be offered", { chatId });
    }
    buttons.push([{ text: `⭐ Pay with ${LANDING_PAGE_STARS} Stars`, callback_data: `buystars:${slug}` }]);

    const message = [
      header("Your Preview Is Ready"),
      `[View your preview](${previewUrl})`,
      esc(
        "That's the real hero section, written specifically for your business — everything below it (value props, social proof, features, a final call-to-action) is ready too, unlocked as soon as you pay."
      ),
    ].join("\n\n");

    await telegram.sendMessageWithButtons(chatId, message, buttons);
    sessionState.delete(chatId);
  } catch (err) {
    logger.error("Landing page generation failed", { chatId, error: err.message });
    sessionState.delete(chatId);
    const userMessage =
      err.message === "LANDING_PAGE_MARKERS_MISSING"
        ? "I generated a page but hit a formatting issue putting it together. Please try /landingpage again."
        : "Something went wrong generating your landing page. Please try /landingpage again in a moment.";
    await telegram.sendMessage(chatId, esc(userMessage));
  }
}

function getGeneration(generationId) {
  return generations.get(generationId) || null;
}

/** Called by index.js once a landing-page purchase (Stripe or Stars) completes. */
function markPaid(generationId) {
  const gen = generations.get(generationId);
  if (gen) {
    gen.paid = true;
  }
  return gen || null;
}

module.exports = {
  handleLandingPage,
  handleDescriptionInput,
  isAwaitingDescription,
  clearSession,
  getGeneration,
  markPaid,
  LANDING_PAGE_SLUG_PREFIX,
};
