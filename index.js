// index.js
// Express server exposing the Telegram webhook endpoint and routing updates
// to command handlers. No bot framework — Telegram updates are parsed manually.

require("dotenv").config();

const express = require("express");
const path = require("path");
const logger = require("./utils/logger");
const telegram = require("./telegram");
const stripeService = require("./stripe");
const { getOffer } = require("./utils/offers");

const handleStart = require("./handlers/start");
const buildHandler = require("./handlers/build");
const handleHelp = require("./handlers/help");
const handleExamples = require("./handlers/examples");
const handleNiches = require("./handlers/niches");
const settingsHandler = require("./handlers/settings");
const handleSupport = require("./handlers/support");
const handleRestart = require("./handlers/restart");
const handleUpgrade = require("./handlers/upgrade");
const handleContentPack = require("./handlers/contentpack");
const handleAutomationPack = require("./handlers/automationpack");
const handleWebsitePack = require("./handlers/websitepack");
const handleBrandingPack = require("./handlers/brandingpack");
const { sendOfferDetail } = require("./handlers/offerDetail");

const app = express();
const PORT = process.env.PORT || 3000;

const processedStripeEventIds = new Set();

app.post("/webhook/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  let event;

  try {
    event = stripeService.constructWebhookEvent(req.body, req.headers["stripe-signature"]);
  } catch (err) {
    logger.error("Stripe webhook signature verification failed", { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    if (processedStripeEventIds.has(event.id)) {
      logger.info("Skipping already-processed Stripe event", { eventId: event.id });
      return res.json({ received: true });
    }
    processedStripeEventIds.add(event.id);

    const session = event.data.object;
    const chatId = session.metadata?.chatId;
    const slug = session.metadata?.slug;
    const offer = slug ? getOffer(slug) : null;

    if (chatId && offer) {
      const publicUrl = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
      const fileUrl = `${publicUrl}/products/${offer.fileName}`;
      try {
        await telegram.sendDocument(chatId, fileUrl, `Here's your ${offer.name} — thanks for your purchase!`);
        logger.info("Delivered purchased file via Telegram", { chatId, slug });
      } catch (err) {
        logger.error("Failed to deliver purchased file via Telegram", { chatId, slug, error: err.message });
      }
    } else {
      logger.warn("checkout.session.completed missing chatId/slug or unknown offer", {
        chatId,
        slug,
        sessionId: session.id,
      });
    }
  }

  res.json({ received: true });
});

app.use(express.json());
app.use("/products", express.static(path.join(__dirname, "products")));
app.use(express.static(path.join(__dirname, "public")));

const COMMANDS = {
  "/start": (chatId) => handleStart(chatId),
  "/build": (chatId) => buildHandler.handleBuild(chatId),
  "/help": (chatId) => handleHelp(chatId),
  "/examples": (chatId) => handleExamples(chatId),
  "/niches": (chatId) => handleNiches(chatId),
  "/settings": (chatId) => settingsHandler.handleSettings(chatId),
  "/support": (chatId) => handleSupport(chatId),
  "/restart": (chatId) => handleRestart(chatId),
  "/upgrade": (chatId) => handleUpgrade(chatId),
  "/contentpack": (chatId) => handleContentPack(chatId),
  "/automationpack": (chatId) => handleAutomationPack(chatId),
  "/websitepack": (chatId) => handleWebsitePack(chatId),
  "/brandingpack": (chatId) => handleBrandingPack(chatId),
};

function parseCommand(text) {
  const match = text.match(/^(\/[a-zA-Z_]+)(@\S+)?/);
  return match ? match[1].toLowerCase() : null;
}

async function routeTextMessage(chatId, text) {
  if (buildHandler.isAwaitingNiche(chatId)) {
    await buildHandler.handleNicheInput(chatId, text);
    return;
  }

  await telegram.sendMessage(
    chatId,
    "Not sure what you mean\\. Try /build to generate a business kit, or /help to see all commands\\."
  );
}

async function routeMessage(message) {
  const chatId = message.chat?.id;
  const text = message.text;

  if (!chatId || typeof text !== "string") {
    logger.warn("Received message with no chat id or text, skipping", { message });
    return;
  }

  const command = text.startsWith("/") ? parseCommand(text) : null;

  if (command && COMMANDS[command]) {
    logger.info("Routing command", { chatId, command });
    await COMMANDS[command](chatId, text);
    return;
  }

  if (command && !COMMANDS[command]) {
    await telegram.sendMessage(
      chatId,
      "Unknown command\\.
