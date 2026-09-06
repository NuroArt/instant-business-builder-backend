// handlers/build.js
// Handles the /build command and the follow-up free-text niche message.
//
// Usage limit: each chatId gets 1 free kit generation. After that, /build
// shows a paywall with a one-time $19 Stripe Payment Link that unlocks
// unlimited future generations for that chatId, forever. Same static
// Payment Link + client_reference_id pattern as the four premium packs —
// see index.js's webhook handler for how the "buildunlock" purchase gets
// recognized and applied (it doesn't deliver a file, it just flips a flag).
//
// Free-build-used and unlock status are stored in Redis (see utils/store.js),
// NOT in a plain in-memory Map — a customer who pays $19 must not lose that
// unlock the next time this service redeploys or spins down from
// inactivity. Session state for the /build conversation itself (which step
// they're on right now) stays in-memory, since losing that mid-conversation
// just means re-running /build, which is a minor inconvenience rather than
// a paid feature silently disappearing.

const telegram = require("../telegram");
const claude = require("../claude");
const logger = require("../utils/logger");
const store = require("../utils/store");
const { formatBusinessKit, header, esc } = require("../utils/formatOutput");

const sessionState = new Map();

const BUILD_UNLOCK_SLUG = "buildunlock";
const BUILD_UNLOCK_PRICE = "$19";
const BUILD_UNLOCK_LINK = process.env.STRIPE_LINK_BUILD_UNLOCK;

const PROGRESS_STAGES = [
  "Analyzing niche",
  "Building foundation",
  "Generating product suite",
  "Writing website copy",
  "Building marketing system",
  "Mapping automation",
  "Finalizing monetization strategy",
];

function unlockKey(chatId) {
  return `build_unlocked:${chatId}`;
}

function freeUsedKey(chatId) {
  return `build_free_used:${chatId}`;
}

async function isBuildUnlocked(chatId) {
  const value = await store.getValue(unlockKey(chatId));
  return value === "1";
}

/** Called by index.js's Stripe webhook handler once a "buildunlock" purchase completes. */
async function markBuildUnlocked(chatId) {
  await store.setValue(unlockKey(chatId), "1");
}

async function hasUsedFreeBuild(chatId) {
  const value = await store.getValue(freeUsedKey(chatId));
  return value === "1";
}

async function consumeFreeBuild(chatId) {
  await store.setValue(freeUsedKey(chatId), "1");
}

async function sendBuildPaywall(chatId) {
  if (!BUILD_UNLOCK_LINK) {
    logger.error("STRIPE_LINK_BUILD_UNLOCK is not set — cannot show build paywall", { chatId });
    await telegram.sendMessage(
      chatId,
      esc("Additional kit generations aren't available for purchase right now. Please contact /support.")
    );
    return;
  }

  const checkoutUrl = `${BUILD_UNLOCK_LINK}?client_reference_id=${chatId}_${BUILD_UNLOCK_SLUG}`;

  const message = [
    header("You've Used Your Free Kit"),
    esc("Your first business kit generation is free. Unlock unlimited future generations with a one-time payment — no limits, ever, on any niche."),
  ].join("\n\n");

  await telegram.sendMessageWithButtons(chatId, message, [
    [{ text: `Unlock Unlimited Builds — ${BUILD_UNLOCK_PRICE}`, url: checkoutUrl }],
  ]);
}

async function handleBuild(chatId) {
  const [unlocked, freeUsed] = await Promise.all([isBuildUnlocked(chatId), hasUsedFreeBuild(chatId)]);

  if (!unlocked && freeUsed) {
    await sendBuildPaywall(chatId);
    return;
  }

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

    // Only consume the free build credit on a genuinely successful delivery —
    // a failed/timed-out attempt shouldn't cost the user their free try.
    const unlocked = await isBuildUnlocked(chatId);
    if (!unlocked) {
      await consumeFreeBuild(chatId);
    }

    await telegram.sendMessage(
      chatId,
      [
        header("Kit Complete"),
        esc("Your business starter kit is ready above."),
        esc("Want more? /upgrade unlocks the Content Pack, Automation Pack, Website Pack, and Branding Pack."),
        unlocked
          ? esc("Run /build again anytime to generate a kit for a different niche.")
          : esc("Your free kit generation has been used — run /build again to unlock unlimited future kits."),
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
  isBuildUnlocked,
  markBuildUnlocked,
};
