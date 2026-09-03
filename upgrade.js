// handlers/upgrade.js

const telegram = require("../telegram");
const { header, esc, bulletList } = require("../utils/formatOutput");
const { OFFERS } = require("../utils/offers");

async function handleUpgrade(chatId) {
  const offerLines = OFFERS.map(
    (offer) => `${offer.name} (${offer.price}) — ${offer.tagline} See ${offer.command} for details.`
  );

  const message = [
    header("Premium Add-Ons"),
    esc("Full app access unlocks unlimited kit generations. Add-ons expand any kit with deeper, ready-to-use assets."),
    "*Add\\-Ons:*\n" + bulletList(offerLines),
    esc("Bundle: Instant Business Builder + NuroWorks Website Launch System — priced below buying each separately."),
  ].join("\n\n");

  const buttons = OFFERS.map((offer) => [
    { text: `${offer.name} — ${offer.price}`, callback_data: `upgrade:${offer.slug}` },
  ]);

  await telegram.sendMessageWithButtons(chatId, message, buttons);
}

module.exports = handleUpgrade;
