// handlers/start.js

const telegram = require("../telegram");
const { header, esc } = require("../utils/formatOutput");

async function handleStart(chatId) {
  const message = [
    header("Instant Business Builder"),
    esc("A NuroWorks product. One idea. One message. One complete business."),
    esc(
      "Send /build and give me your niche or business idea. I'll generate a full starter kit: brand foundation, product suite, website copy, marketing system, automation workflows, and a monetization strategy."
    ),
    `${esc("Commands:")}\n` +
      `${esc("/build")} — generate your business kit\n` +
      `${esc("/help")} — how this works\n` +
      `${esc("/examples")} — see a sample kit\n` +
      `${esc("/niches")} — niche ideas to try\n` +
      `${esc("/settings")} — preferences\n` +
      `${esc("/support")} — get help\n` +
      `${esc("/restart")} — start over`,
  ].join("\n\n");

  await telegram.sendMessage(chatId, message);
}

module.exports = handleStart;
