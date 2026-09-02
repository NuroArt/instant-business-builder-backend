// handlers/support.js

const telegram = require("../telegram");
const { header, esc } = require("../utils/formatOutput");

const SUPPORT_CONTACT = process.env.SUPPORT_CONTACT || "@NuroWorksSupport";

async function handleSupport(chatId) {
  const message = [
    header("Support"),
    esc("Having an issue with a generated kit, a payment, or something else?"),
    esc(`Message ${SUPPORT_CONTACT} directly and we'll get you sorted.`),
    esc("Common fixes:"),
    esc("• Kit generation failed → try /build again\n• Stuck mid-flow → run /restart\n• Payment/add-on issue → contact support with your Telegram username"),
  ].join("\n\n");

  await telegram.sendMessage(chatId, message);
}

module.exports = handleSupport;
