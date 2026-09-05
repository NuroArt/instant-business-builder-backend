// index.js
// Express server exposing the Telegram webhook endpoint and routing updates
// to command handlers. No bot framework — Telegram updates are parsed manually.
//
// Payment: purchases go through static Stripe Payment Links (see
// utils/offers.js) rather than a dynamically-created Checkout Session. The
// bot just tags the pre-made link with `?client_reference_id=chatId:slug`
// and sends it — no outbound Stripe API call happens during the Telegram
// interaction at all. The webhook then reads that same client_reference_id
// back off the completed session to know who to deliver the file to.

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
    const ref = session.client_reference_id || "";
    const [chatId, slug] = ref.split(":");
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
      logger.warn("checkout.session.completed missing/invalid client_reference_id or unknown offer", {
        ref,
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
      "Unknown command\\. Try /help to see everything I can do\\."
    );
    return;
  }

  await routeTextMessage(chatId, text);
}

async function routeCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message?.chat?.id;
  const data = callbackQuery.data || "";

  if (!chatId) {
    logger.warn("Received callback_query with no chat id, skipping", { callbackQuery });
    return;
  }

  logger.info("Routing callback_query", { chatId, data });

  if (data.startsWith("settings:")) {
    await settingsHandler.handleSettingsCallback(chatId, data);
    return;
  }

  if (data.startsWith("upgrade:")) {
    await sendOfferDetail(chatId, data.split(":")[1]);
    return;
  }

  if (data.startsWith("buy:")) {
    const slug = data.split(":")[1];
    const offer = getOffer(slug);

    if (!offer) {
      await telegram.sendMessage(chatId, "Sorry, I couldn't find that add\\-on\\. Run /upgrade to see what's available\\.");
      return;
    }

    if (!offer.paymentLink) {
      const allStripeKeys = Object.keys(process.env).filter((k) => k.includes("STRIPE"));
      logger.error("No payment link configured for offer", { slug, allStripeKeys });
      await telegram.sendMessage(chatId, `DEBUG v4: all env keys containing STRIPE are: ${allStripeKeys.join(", ") || "NONE FOUND"}`);
      return;
    }

    // No Stripe API call here — just tag the pre-made static Payment Link
    // with who's buying (chatId) and what (slug), so the webhook can later
    // read it straight back off the completed Checkout Session.
    const checkoutUrl = `${offer.paymentLink}?client_reference_id=${encodeURIComponent(`${chatId}:${slug}`)}`;

    await telegram.sendMessageWithButtons(
      chatId,
      `Tap below to pay securely via Stripe\\. Your file arrives right here as soon as payment is confirmed\\.`,
      [[{ text: `Pay ${offer.price}`, url: checkoutUrl }]]
    );
    return;
  }

  logger.warn("Unhandled callback_query data", { data });
}

app.post("/webhook", async (req, res) => {
  const update = req.body;

  try {
    if (update.message) {
      await routeMessage(update.message);
    } else if (update.callback_query) {
      await routeCallbackQuery(update.callback_query);
    } else {
      logger.debug("Received unhandled update type", { update });
    }
  } catch (err) {
    logger.error("Unhandled error processing update", { error: err.message, stack: err.stack });

    const chatId =
      update.message?.chat?.id || update.callback_query?.message?.chat?.id;

    if (chatId) {
      try {
        await telegram.sendMessage(
          chatId,
          "Something went wrong on my end\\. Please try again, or use /support if it keeps happening\\."
        );
      } catch (sendErr) {
        logger.error("Failed to send error notice to user", { error: sendErr.message });
      }
    }
  }

  res.sendStatus(200);
});

// Simple health check for uptime monitoring / load balancer probes.
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.listen(PORT, () => {
  logger.info(`Instant Business Builder backend listening on port ${PORT}`);

  if (process.env.PUBLIC_URL) {
    telegram
      .setWebhook(process.env.PUBLIC_URL)
      .catch((err) => logger.error("Failed to register webhook on startup", { error: err.message }));
  } else {
    logger.warn("PUBLIC_URL not set — webhook was not auto-registered. Set it manually via Telegram's setWebhook API.");
  }
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason });
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { error: err.message, stack: err.stack });
});
