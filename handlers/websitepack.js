// handlers/websitepack.js

const { sendOfferDetail } = require("./offerDetail");

async function handleWebsitePack(chatId) {
  await sendOfferDetail(chatId, "website");
}

module.exports = handleWebsitePack;
