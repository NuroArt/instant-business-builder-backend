// handlers/contentpack.js

const { sendOfferDetail } = require("./offerDetail");

async function handleContentPack(chatId) {
  await sendOfferDetail(chatId, "content");
}

module.exports = handleContentPack;
