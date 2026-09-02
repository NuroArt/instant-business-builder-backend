// handlers/examples.js

const telegram = require("../telegram");
const { header, esc } = require("../utils/formatOutput");

async function handleExamples(chatId) {
  const message = [
    header("Sample Kit Preview"),
    esc('Niche: "mobile dog grooming"'),
    "*Business Name Options \\(sample\\):*\n" +
      "• PawVan Mobile Grooming\n• Groom On Wheels\n• The Mobile Muttery",
    "*Value Proposition \\(sample\\):*\n" +
      esc("Professional dog grooming that comes to your driveway — no crate, no car ride, no waiting room stress."),
    "*Sample Reel Script:*\n" +
      esc('"POV: your dog gets a spa day without ever leaving the yard." — 15-second before/after transformation'),
    esc("This is a trimmed preview. Run /build and enter your own niche to generate the full six-module kit."),
  ].join("\n\n");

  await telegram.sendMessage(chatId, message);
}

module.exports = handleExamples;
