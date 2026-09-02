// handlers/automationpack.js

const { sendOfferDetail } = require("./offerDetail");

async function handleAutomationPack(chatId) {
  await sendOfferDetail(chatId, "automation");
}

module.exports = handleAutomationPack;
