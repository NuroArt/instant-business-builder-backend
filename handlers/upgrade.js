// handlers/upgrade.js

const telegram = require("../telegram");
const { header, esc, bulletList } = require("../utils/formatOutput");

const ADD_ONS = [
  "Content Pack — 90-day content calendar, 50 extra reel scripts, full caption library",
  "Automation Pack — ready-to-import workflow templates for every automation in your kit",
  "Website Pack — full multi-page website copy with SEO meta descriptions",
  "Branding Pack — logo direction, color palette, typography system, brand guideline sheet",
];

async function handleUpgrade(chatId) {
  const message = [
    header("Premium Add-Ons"),
    esc("Full app access unlocks unlimited kit generations. Add-ons expand any kit with deeper, ready-to-use assets."),
        "*Add\\-Ons:*\n" + bulletList(ADD_ONS),,
    esc("Bundle: Instant Business Builder + NuroWorks Website Launch System — priced below buying each separately."),
    esc("Contact /support for pricing and to unlock an add-on."),
  ].join("\n\n");

  const buttons = [
    [{ text: "Content Pack", callback_data: "upgrade:content" }],
    [{ text: "Automation Pack", callback_data: "upgrade:automation" }],
    [{ text: "Website Pack", callback_data: "upgrade:website" }],
    [{ text: "Branding Pack", callback_data: "upgrade:branding" }],
  ];

  await telegram.sendMessageWithButtons(chatId, message, buttons);
}

module.exports = handleUpgrade;
