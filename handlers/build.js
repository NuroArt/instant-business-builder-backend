// handlers/build.js
// Handles the /build command and the follow-up free-text niche message.

const telegram = require("../telegram");
const claude = require("../claude");
const logger = require("../utils/logger");
const { formatBusinessKit, header, esc } = require("../utils/formatOutput");

const sessionState = new Map();

const PROGRESS_STAGES = [
  "Analyzing niche",
  "Building foundation",
  "Generating product suite",
  "Writing website copy",
  "Building marketing system",
  "Mapping automation",
  "Finalizing monetization strategy",
];

async function handleBuild(chatId) {
  sessionState.set(chatId, "awaiting_niche");

  const message = [
    header("Let's Build Your Business"),
    esc("What niche or business idea do you want to build?"),
    esc('Example: "mobile dog grooming" or "online nutrition coaching for new parents"'),
  ].join("\n\n");

  await telegram.sendMessage(chatId, message);
}

async function handleNicheInput(chatId, niche) {
  const trimmed = (niche || "").trim();

  if (trimmed.length < 3) {
    await telegram.sendMessage(
      chatId,
      esc("That's a bit short — tell me a little more about the niche or business idea.")
    );
    return;
  }

  sessionState.set(chatId, "generating");

  await telegram.sendMessage(
    chatId,
    `${header("Generating Your Kit")}\n\n${esc(`Niche: ${trimmed}`)}\n\n${esc(
      PROGRESS_STAGES.join(" → ")
    )}`
  );
  await telegram.sendTyping(chatId);

  try {
    const kit = await claude.generateBusinessKit(trimmed);
    const messages = formatBusinessKit(kit);

    if (messages.length === 0) {
      throw new Error("EMPTY_KIT");
    }

    for (const msg of messages) {
      await telegram.sendMessage(chatId, msg);
      await telegram.sendTyping(chatId);
    }

    await telegram.sendMessage(
      chatId,
      [
        header("Kit Complete"),
        esc("Your business starter kit is ready above."),
        esc("Want more? /upgrade unlocks the Content Pack, Automation Pack, Website Pack, and Branding Pack."),
        esc("Run /build again anytime to generate a kit for a different niche."),
      ].join("\n\n")
    );

    sessionState.delete(chatId);
  } catch (err) {
    logger.error("Business kit generation failed", { chatId, error: err.message });
    sessionState.delete(chatId);

    const userMessage =
      err.message === "BUSINESS_KIT_PARSE_ERROR"
        ? "I generated a kit but hit a formatting error putting it together. Please try /build again."
        : "Something went wrong generating your kit. Please try /build again in a moment.";

    await telegram.sendMessage(chatId, esc(userMessage));
  }
}

function isAwaitingNiche(chatId) {
  return sessionState.get(chatId) === "awaiting_niche";
}

function clearSession(chatId) {
  sessionState.delete(chatId);
}

module.exports = {
  handleBuild,
  handleNicheInput,
  isAwaitingNiche,
  clearSession,
};
