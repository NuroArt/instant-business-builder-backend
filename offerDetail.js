// handlers/offerDetail.js
// Shared renderer for a single add-on's detail message. Used by each dedicated
// offer command (/contentpack, /automationpack, /websitepack, /brandingpack)
// and by the inline buttons on /upgrade, so the message only needs to be
// built in one place.
//
// The "Buy Now" button uses callback_data (not a static url) because we need
// to create a fresh Stripe Checkout Session — tagged with this specific
// chatId — at the moment of the tap, not ahead of time. See index.js's
// "buy:" callback handler for what happens after the tap.

const telegram = require("../telegram");
const { header, esc, bulletList } = require("../utils/formatOutput");
const { getOffer } = require("../utils/offers");

async function sendOfferDetail(chatId, slug) {
  const offer = getOffer(slug);

  if (!offer) {
    await telegram.sendMessage(chatId, esc("I couldn't find that add-on. Run /upgrade to see what's available."));
    return;
  }

  const message = [
    header(offer.name),
    esc(`${offer.tagline} — ${offer.price}`),
    "*What's included:*\n" + bulletList(offer.includes),
    esc("Tap below to check out securely via Stripe. Your file is delivered right here in this chat as soon as payment is confirmed."),
  ].join("\n\n");

  await telegram.sendMessageWithButtons(chatId, message, [
    [{ text: `Buy Now — ${offer.price}`, callback_data: `buy:${offer.slug}` }],
  ]);
}

module.exports = { sendOfferDetail };
