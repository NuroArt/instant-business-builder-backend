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

/**
 * Parses a Claude text response as JSON, tolerating stray markdown fences.
 * @param {string} raw
 * @param {string} label - short identifier used in error logs (e.g. "part1")
 * @returns {object}
 */
function parseJsonResponse(raw, label) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    const cleaned = raw.replace(/^```(json)?/m, "").replace(/```$/m, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch (secondErr) {
      logger.error(`Failed to parse Claude business kit response as JSON (${label})`, {
        error: secondErr.message,
        rawPreview: raw.slice(0, 500),
      });
      throw new Error("BUSINESS_KIT_PARSE_ERROR");
    }
  }
}

// ---------------------------------------------------------------------------
// Master prompts for the Instant Business Builder kit generator
//
// NOTE ON SPLITTING: generation is split into two smaller calls (Part 1:
// foundation/products/websiteCopy, Part 2: marketing/automation/monetization)
// run in parallel, instead of one large call. A single call requesting the
// full six-module kit reliably exceeded the model's ~8000-token output cap —
// even after trimming array counts, the long-form prose fields (homepage
// copy, automation workflows, funnel strategy, etc.) pushed the response past
// the limit and truncated mid-JSON, causing "Unterminated string" / "Unexpected
// end of JSON input" parse errors. Splitting halves the output size per call,
// giving each one comfortable headroom, and an explicit per-field length cap
// is enforced below as a second safeguard. formatOutput.js and build.js are
// unaffected since generateBusinessKit still returns the same merged shape.
// ---------------------------------------------------------------------------

const SHARED_VOICE_INSTRUCTIONS = `You are the generation engine for "Instant Business Builder," a premium
NuroWorks product. Given a single niche or business idea, you produce part of a complete business starter kit.

Voice: clean, professional, confident, direct. No fluff, no filler, no generic corporate language.
Every line must be usable as-is by a real founder.

LENGTH DISCIPLINE (critical): every prose string field must be 1-3 sentences (roughly 25-50 words).
Do not write paragraphs. Every array item must be a single short line, never a list of sentences.
Prioritize returning complete, valid JSON over exhaustive detail — brevity is required, not optional.`;

const PART1_SYSTEM_PROMPT = `${SHARED_VOICE_INSTRUCTIONS}

You MUST return output as valid JSON with exactly this shape (no markdown fences, no commentary
outside the JSON, no other top-level keys):

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
    "digitalProducts": ["string", ...3-5 items],
    "services": ["string", ...3-5 items],
    "subscriptions": ["string", ...2-3 items],
    "automationOffers": ["string", ...2-3 items],
    "upsellsAndBundles": ["string", ...2-3 items]
  },
  "websiteCopy": {
    "homepage": "string",
    "about": "string",
    "servicesPage": "string",
    "ctaLines": ["string", ...5 items],
    "taglines": ["string", ...5 items],
    "brandVoiceGuide": "string"
  }
}

CRITICAL: the entire JSON response must fit comfortably within 3500 tokens. Never truncate
mid-string — if running low on space, shorten remaining fields rather than cutting off.`;

const PART2_SYSTEM_PROMPT = `${SHARED_VOICE_INSTRUCTIONS}

You MUST return output as valid JSON with exactly this shape (no markdown fences, no commentary
outside the JSON, no other top-level keys):

{
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
    "clientOnboarding": "string",
    "contentAutomation": "string",
    "salesFunnelAutomation": "string",
    "leadCaptureAutomation": "string",
    "weeklyOperations": "string"
  },
  "monetization": {
    "pricingRecommendations": "string",
    "salesAngles": ["string", ...3 items],
    "funnelStrategy": "string",
    "launchPlan": "string",
    "growthRoadmap": "string"
  }
}

CRITICAL: the entire JSON response must fit comfortably within 3500 tokens. Never truncate
mid-string — if running low on space, shorten remaining fields rather than cutting off.`;

/**
 * Generates a full business kit for a given niche by running two smaller,
 * focused Claude calls in parallel and merging the results.
 * @param {string} niche - raw user input describing their business idea
 * @returns {Promise<object>} parsed business kit object with foundation, products,
 *   websiteCopy, marketing, automation, and monetization keys
 */
async function generateBusinessKit(niche) {
  const userPrompt = `Niche / business idea: "${niche}"\n\nGenerate this part of the business kit as specified.`;

  const [part1Raw, part2Raw] = await Promise.all([
    callClaude(PART1_SYSTEM_PROMPT, userPrompt, { maxTokens: 4500 }),
    callClaude(PART2_SYSTEM_PROMPT, userPrompt, { maxTokens: 4500 }),
  ]);

  const part1 = parseJsonResponse(part1Raw, "part1: foundation/products/websiteCopy");
  const part2 = parseJsonResponse(part2Raw, "part2: marketing/automation/monetization");

  return { ...part1, ...part2 };
}

module.exports = {
  callClaude,
  generateBusinessKit,
};
