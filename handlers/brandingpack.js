// handlers/brandingpack.js

const { sendOfferDetail } = require("./offerDetail");

async function handleBrandingPack(chatId) {
  await sendOfferDetail(chatId, "branding");
}

module.exports = handleBrandingPack;
