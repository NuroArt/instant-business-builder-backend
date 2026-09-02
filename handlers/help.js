// handlers/help.js

const telegram = require("../telegram");
const { formatSimpleMessage, esc, header } = require("../utils/formatOutput");

async function handleHelp(chatId) {
  const message = [
    header("How It Works"),
    esc("1. Run /build\n2. Tell me your niche or business idea in one sentence\n3. I generate a complete business starter kit: foundation, products, website copy, marketing, automation, and monetization"),
    formatSimpleMessage("Other Commands", [
      "/examples — see a sample kit",
      "/niches — niche ideas if you're not sure where to start",
      "/settings — preferences",
      "/support — get help from a human",
      "/restart — clear your session and start over",
    ]),
  ].join("\n\n");

  await telegram.sendMessage(chatId, message);
}

module.exports = handleHelp;
