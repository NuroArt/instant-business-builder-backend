// utils/store.js
// Thin wrapper around Upstash Redis (REST-based, no persistent connection
// needed — a good fit for Render's hosting model) for the small pieces of
// state that MUST survive a restart or redeploy: whether a chatId has used
// their free /build generation, and whether they've paid to unlock
// unlimited builds. Everything else in this bot (session state, settings)
// stays in-memory since losing it just means re-asking a question — but
// losing build-unlock status after someone paid $19 would be a real
// customer-harm bug, not just an inconvenience.

const logger = require("./logger");

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const configured = Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);

if (!configured) {
  logger.warn(
    "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — build usage and unlock status will NOT persist across restarts."
  );
}

// In-memory fallback used only if Upstash isn't configured, so local
// development or a missing-env-var situation doesn't hard-crash the bot —
// it just silently loses persistence, same as before this fix.
const memoryFallback = new Map();

async function redisRequest(command) {
  const res = await fetch(UPSTASH_REDIS_REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upstash request failed with status ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.result;
}

/**
 * Gets a stored value by key. Returns null if not set.
 */
async function getValue(key) {
  if (!configured) {
    return memoryFallback.get(key) ?? null;
  }
  try {
    const result = await redisRequest(["GET", key]);
    return result;
  } catch (err) {
    logger.error("Upstash GET failed", { key, error: err.message });
    // Fail safe toward NOT granting unlocks/free-builds incorrectly: treat
    // a lookup failure as "unknown", and let the caller decide the safe
    // default (build.js treats an unreadable unlock status as "not
    // unlocked" rather than silently letting someone through for free).
    return null;
  }
}

/**
 * Sets a value by key, with no expiry (this data should persist indefinitely).
 */
async function setValue(key, value) {
  if (!configured) {
    memoryFallback.set(key, value);
    return;
  }
  try {
    await redisRequest(["SET", key, value]);
  } catch (err) {
    logger.error("Upstash SET failed", { key, error: err.message });
    throw err;
  }
}

module.exports = { getValue, setValue };
