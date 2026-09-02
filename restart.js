// handlers/restart.js

const telegram = require("../telegram");
const { clearSession } = require("./build");
const { header, esc } = require("../utils/formatOutput");

async function handleRestart(chatId) {
  clearSession(chatId);

  const message = [
    header("Session Reset"),
    esc("Your session has been cleared. Run /build whenever you're ready to generate a new business kit."),
  ].join("\n\n");

  await telegram.sendMessage(chatId, message);
}

module.exports = handleRestart;
