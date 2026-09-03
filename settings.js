// handlers/settings.js
// Minimal per-user preferences store. Swap the Map for a real DB table in production.

const telegram = require("../telegram");
const { header, esc } = require("../utils/formatOutput");

const DEFAULT_SETTINGS = { outputLength: "standard" }; // "concise" | "standard" | "detailed"
const userSettings = new Map();

function getSettings(chatId) {
  return userSettings.get(chatId) || { ...DEFAULT_SETTINGS };
}

function setSetting(chatId, key, value) {
  const current = getSettings(chatId);
  current[key] = value;
  userSettings.set(chatId, current);
  return current;
}

async function handleSettings(chatId) {
  const current = getSettings(chatId);

  const message = [
    header("Settings"),
    esc(`Current output length: ${current.outputLength}`),
    esc("Choose how detailed you want your generated kits to be:"),
  ].join("\n\n");

  const buttons = [
    [{ text: "Concise", callback_data: "settings:outputLength:concise" }],
    [{ text: "Standard", callback_data: "settings:outputLength:standard" }],
    [{ text: "Detailed", callback_data: "settings:outputLength:detailed" }],
  ];

  await telegram.sendMessageWithButtons(chatId, message, buttons);
}

/**
 * Handles callback_query updates routed here from index.js (data starting with "settings:").
 */
async function handleSettingsCallback(chatId, data) {
  const [, key, value] = data.split(":");
  const updated = setSetting(chatId, key, value);

  await telegram.sendMessage(
    chatId,
    esc(`Updated. Output length is now set to: ${updated.outputLength}`)
  );
}

module.exports = {
  handleSettings,
  handleSettingsCallback,
  getSettings,
};
