// claude.js
// Wrapper around Anthropic's Messages API for generating business kit content.

const axios = require("axios");
const logger = require("./utils/logger");

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-5";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

if (!CLAUDE_API_KEY) {
  logger.warn("CLAUDE_API_KEY is not set — Claude calls will fail until it is configured.");
}

const client = axios.create({
  baseURL: CLAUDE_API_URL,
  timeout: 240000, // generation can take a while for a full business kit
  headers: {
    "x-api-key": CLAUDE_API_KEY,
    "anthropic-version": ANTHROPIC_VERSION,
    "content-type": "application/json",
  },
});

/**
 * Low-level call to the Messages API. Retries once on transient (5xx/timeout) failures.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {object} [opts]
 * @returns {Promise<string>} the model's text response
 */
async function callClaude(systemPrompt, userPrompt, opts = {}) {
  const payload = {
    model: opts.model || CLAUDE_MODEL,
    max_tokens: opts.maxTokens || 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  };

  const attempt = async () => {
    const res = await client.post("", payload);
    const textBlocks = (res.data.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text);
    return textBlocks.join("\n").trim();
  };

  try {
    return await attempt();
  } catch (err) {
    const status = err.response?.status;
    const isRetryable = !status || status >= 500 || err.code === "ECONNABORTED";

    if (isRetryable) {
      logger.warn("Claude API call failed, retrying once", {
        status,
        error: err.response?.data || err.message,
      });
      try {
        return await attempt();
      } catch (retryErr) {
        logger.error("Claude API retry failed", {
          error: retryErr.response?.data || retryErr.message,
        });
        throw retryErr;
      }
    }

    logger.error("Claude API call failed (non-retryable)", {
      status,
      error: err.response?.data || err.message,
    });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Master prompt for the Instant Business Builder kit generator
//
// NOTE ON SIZE: the schema below is intentionally trimmed (12-15 content-calendar
// items instead of a literal 30, 6-8 captions instead of 10-15, 4-5 reel scripts
// instead of 5-10) and paired with an explicit token budget instruction. Without
// these limits, Claude's response reliably exceeded the 8000-token max_tokens cap
// and got cut off mid-JSON, which produced "Unterminated string" parse errors
// downstream. formatOutput.js numbers calendar/email items dynamically off array
// length, so shorter arrays render fine with no other code changes needed.
// ---------------------------------------------------------------------------

const MASTER_SYSTEM_PROMPT = `You are the generation engine for "Instant Business Builder," a premium
NuroWorks product. Given a single niche or business idea, you produce a complete business starter kit.

Voice: clean, professional, confident, direct. No fluff, no filler, no generic corporate language.
Every line must be usable as-is by a real founder.

You MUST return output as valid JSON with exactly this shape (no markdown fences, no commentary
outside the JSON):

{
  "foundation": {
    "businessNames": ["string", ...5-7 items],
    "brandIdentity": "string",
    "mission": "string",
    "vision": "string",
    "valueProposition": "string",
    "targetAudience": "string",
    "competitorSnapshot": "string",
    "marketGap": "string"
  },
  "products": {
    "digitalProducts": ["string", ...],
    "services": ["string", ...],
    "subscriptions": ["string", ...],
    "automationOffers": ["string", ...],
    "upsellsAndBundles": ["string", ...]
  },
  "websiteCopy": {
    "homepage": "string",
    "about": "string",
    "servicesPage": "string",
    "ctaLines": ["string", ...5 items],
    "taglines": ["string", ...5 items],
    "brandVoiceGuide": "string"
  },
  "marketing": {
    "contentCalendar30Day": ["string", ...12-15 items, one per content idea, each under 10 words],
    "reelScripts": ["string", ...4-5 sample items, each under 20 words],
    "carouselScripts": ["string", ...5 items],
    "captions": ["string", ...6-8 sample items, each under 15 words],
    "hashtagSets": { "broad": ["string"], "niche": ["string"], "branded": ["string"] },
    "emailWelcomeSequence": ["string", ...5 items],
    "leadMagnetConcept": "string"
  },
  "automation": {
