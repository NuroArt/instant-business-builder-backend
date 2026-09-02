// handlers/offerDetail.js
// Shared renderer for a single add-on's detail message. Used by each dedicated
// offer command (/contentpack, /automationpack, /websitepack, /brandingpack)
// and by the inline buttons on /upgrade, so the message only needs to be
// built in one place.

const telegram = require("../telegram");
const { header, esc, bulletList } = require("../utils/formatOutput");
const { getOffer } = require("../utils/offers");

/**
 * Sends the detail message for one offer by slug ("content", "automation",
 * "website", or "branding"). Includes a checkout button if a live Payhip URL
 * is configured for that offer; otherwise shows a "coming soon" note.
 */
async function sendOfferDetail(chatId, slug) {
  const offer = getOffer(slug);

  if (!offer) {
    await telegram.sendMessage(chatId, esc("I couldn't find that add-on. Run /upgrade to see what's available."));
    return;
  }

  const checkoutUrl = process.env[offer.checkoutUrlEnv];

  const message = [
    header(offer.name),
    esc(`${offer.tagline} — ${offer.price}`),
    "*What's included:*\n" + bulletList(offer.includes),
    checkoutUrl
      ? esc("Tap below to check out.")
      : esc("Checkout isn't live yet — message /support to get on the list and I'll notify you the moment it's ready."),
  ].join("\n\n");

  if (checkoutUrl) {
    await telegram.sendMessageWithButtons(chatId, message, [
      [{ text: `Get ${offer.name} — ${offer.price}`, url: checkoutUrl }],
    ]);
  } else {
    await telegram.sendMessage(chatId, message);
  }
}

module.exports = { sendOfferDetail };
