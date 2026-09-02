// handlers/niches.js

const telegram = require("../telegram");
const { header, bulletList, esc } = require("../utils/formatOutput");

const NICHE_IDEAS = [
  "Mobile pet grooming",
  "Online nutrition coaching for new parents",
  "Local home organization service",
  "Niche freelance copywriting (SaaS, real estate, etc.)",
  "Subscription meal prep for athletes",
  "Boutique social media management for local restaurants",
  "Custom pet portraits (digital or print)",
  "Corporate wellness workshops",
  "Handmade candle or home fragrance brand",
  "Bookkeeping for solo entrepreneurs",
];

async function handleNiches(chatId) {
  const message = [
    header("Niche Ideas"),
    esc("Not sure where to start? Try one of these, or use it as inspiration for your own:"),
    bulletList(NICHE_IDEAS),
    esc("When you're ready, run /build and enter your niche."),
  ].join("\n\n");

  await telegram.sendMessage(chatId, message);
}

module.exports = handleNiches;
