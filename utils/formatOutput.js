// utils/formatOutput.js
// Converts raw business-kit data (or plain strings) into clean, Telegram-safe
// MarkdownV2 messages, split by module.
 
const MD_ESCAPE_RE = /([_*\[\]()~`>#+\-=|{}.!\\])/g;
 
/** Escapes MarkdownV2 reserved characters inside plain text content. */
function esc(text) {
  if (text === null || text === undefined) return "";
  return String(text).replace(MD_ESCAPE_RE, "\\$1");
}
 
/** Renders a bold section header line, e.g. "🔹 BUSINESS FOUNDATION" */
function header(title) {
  return `*${esc(`🔹 ${title.toUpperCase()}`)}*`;
}
 
/** Renders an array as a bullet list, escaping each item. */
function bulletList(items = []) {
  return items
    .filter(Boolean)
    .map((item) => `• ${esc(item)}`)
    .join("\n");
}
 
/** Renders a labeled field: "*Label:* value" */
function field(label, value) {
  if (!value) return "";
  return `*${esc(label)}:*\n${esc(value)}`;
}
 
const DIVIDER = "─────────────────────";
 
/**
 * Formats the "foundation" module.
 */
function formatFoundation(data = {}) {
  const parts = [header("Business Foundation")];
 
  if (data.businessNames?.length) {
    parts.push("*Business Name Options:*\n" + bulletList(data.businessNames));
  }
  parts.push(field("Brand Identity", data.brandIdentity));
  parts.push(field("Mission", data.mission));
  parts.push(field("Vision", data.vision));
  parts.push(field("Value Proposition", data.valueProposition));
  parts.push(field("Target Audience", data.targetAudience));
  parts.push(field("Competitor Snapshot", data.competitorSnapshot));
  parts.push(field("Market Gap", data.marketGap));
 
  return parts.filter(Boolean).join("\n\n");
}
 
/**
 * Formats the "products" module.
 */
function formatProducts(data = {}) {
  const parts = [header("Product Suite")];
 
  if (data.digitalProducts?.length) {
    parts.push("*Digital Products:*\n" + bulletList(data.digitalProducts));
  }
  if (data.services?.length) {
    parts.push("*Services:*\n" + bulletList(data.services));
  }
  if (data.subscriptions?.length) {
    parts.push("*Subscription Ideas:*\n" + bulletList(data.subscriptions));
  }
  if (data.automationOffers?.length) {
    parts.push("*Automation-Ready Offers:*\n" + bulletList(data.automationOffers));
  }
  if (data.upsellsAndBundles?.length) {
    parts.push("*Upsells \\& Bundles:*\n" + bulletList(data.upsellsAndBundles));
  }
 
  return parts.filter(Boolean).join("\n\n");
}
 
/**
 * Formats the "websiteCopy" module.
 */
function formatWebsiteCopy(data = {}) {
  const parts = [header("Website Copy")];
 
  parts.push(field("Homepage", data.homepage));
  parts.push(field("About Page", data.about));
  parts.push(field("Services Page", data.servicesPage));
  if (data.ctaLines?.length) {
    parts.push("*CTA Lines:*\n" + bulletList(data.ctaLines));
  }
  if (data.taglines?.length) {
    parts.push("*Taglines:*\n" + bulletList(data.taglines));
  }
  parts.push(field("Brand Voice Guide", data.brandVoiceGuide));
 
  return parts.filter(Boolean).join("\n\n");
}
 
/**
 * Formats the "marketing" module.
 */
function formatMarketing(data = {}) {
  const parts = [header("Marketing System")];
 
  if (data.contentCalendar30Day?.length) {
    const days = data.contentCalendar30Day
      .map((item, i) => `Day ${i + 1}: ${esc(item)}`)
      .join("\n");
    parts.push("*30-Day Content Calendar:*\n" + days);
  }
  if (data.reelScripts?.length) {
    parts.push("*Reel Scripts \\(sample\\):*\n" + bulletList(data.reelScripts));
  }
  if (data.carouselScripts?.length) {
    parts.push("*Carousel Scripts:*\n" + bulletList(data.carouselScripts));
  }
  if (data.captions?.length) {
    parts.push("*Captions \\(sample\\):*\n" + bulletList(data.captions));
  }
  if (data.hashtagSets) {
    const { broad = [], niche = [], branded = [] } = data.hashtagSets;
    parts.push(
      "*Hashtag Sets:*\n" +
        `Broad: ${esc(broad.join(" "))}\n` +
        `Niche: ${esc(niche.join(" "))}\n` +
        `Branded: ${esc(branded.join(" "))}`
    );
  }
  if (data.emailWelcomeSequence?.length) {
    const emails = data.emailWelcomeSequence
      .map((item, i) => `Email ${i + 1}: ${esc(item)}`)
      .join("\n");
    parts.push("*Email Welcome Sequence:*\n" + emails);
  }
  parts.push(field("Lead Magnet Concept", data.leadMagnetConcept));
 
  return parts.filter(Boolean).join("\n\n");
}
 
/**
 * Formats the "automation" module.
 */
function formatAutomation(data = {}) {
  const parts = [header("Automation Workflows")];
 
  parts.push(field("Client Onboarding Workflow", data.clientOnboarding));
  parts.push(field("Content Automation Workflow", data.contentAutomation));
  parts.push(field("Sales Funnel Automation", data.salesFunnelAutomation));
  parts.push(field("Lead Capture Automation", data.leadCaptureAutomation));
  parts.push(field("Weekly Operations Automation", data.weeklyOperations));
 
  return parts.filter(Boolean).join("\n\n");
}
 
/**
 * Formats the "monetization" module.
 */
function formatMonetization(data = {}) {
  const parts = [header("Monetization Strategy")];
 
  parts.push(field("Pricing Recommendations", data.pricingRecommendations));
  if (data.salesAngles?.length) {
    parts.push("*Sales Angles:*\n" + bulletList(data.salesAngles));
  }
  parts.push(field("Funnel Strategy", data.funnelStrategy));
  parts.push(field("Launch Plan", data.launchPlan));
  parts.push(field("Growth Roadmap", data.growthRoadmap));
 
  return parts.filter(Boolean).join("\n\n");
}
 
/**
 * Formats the "offerBreakdown" section of a Sales & Offer Pack.
 */
function formatOfferBreakdown(data = {}) {
  const parts = [header("Offer Breakdown")];
 
  parts.push(field("Core Offer", data.coreOffer));
 
  if (data.tiers?.length) {
    const tierText = data.tiers
      .map((t) => `*${esc(t.name)} — ${esc(t.price)}*\n` + bulletList(t.includes))
      .join("\n\n");
    parts.push("*Pricing Tiers:*\n\n" + tierText);
  }
 
  if (data.bonuses?.length) {
    parts.push("*Bonuses:*\n" + bulletList(data.bonuses));
  }
 
  parts.push(field("Guarantee", data.guarantee));
  parts.push(field("Price Justification", data.priceJustification));
 
  return parts.filter(Boolean).join("\n\n");
}
 
/**
 * Formats the "salesPageStructure" section of a Sales & Offer Pack.
 */
function formatSalesPageStructure(data = {}) {
  const parts = [header("Sales Page Copy")];
 
  parts.push(field("Headline", data.headline));
  parts.push(field("Subheadline", data.subheadline));
 
  if (data.problemAgitation?.length) {
    parts.push("*Problem Agitation:*\n" + bulletList(data.problemAgitation));
  }
 
  parts.push(field("Solution Intro", data.solutionIntro));
 
  if (data.whatsIncluded?.length) {
    parts.push("*What's Included:*\n" + bulletList(data.whatsIncluded));
  }
 
  if (data.faq?.length) {
    const faqText = data.faq.map((item) => `*Q: ${esc(item.question)}*\n${esc(item.answer)}`).join("\n\n");
    parts.push("*FAQ:*\n\n" + faqText);
  }
 
  parts.push(field("Final CTA", data.finalCTA));
 
  return parts.filter(Boolean).join("\n\n");
}
 
/**
 * Formats the "emailSequence" section of a Sales & Offer Pack.
 */
function formatEmailSequence(emails = []) {
  const parts = [header("Launch Email Sequence")];
 
  emails.forEach((email, i) => {
    const emailParts = [
      `*Email ${i + 1}: ${esc(email.subject)}*`,
      field("Purpose", email.purpose),
      field("Key Message", email.keyMessage),
      field("CTA", email.cta),
    ].filter(Boolean);
    parts.push(emailParts.join("\n"));
  });
 
  return parts.filter(Boolean).join("\n\n");
}
 
/**
 * Formats the "upsellDownsell" section of a Sales & Offer Pack.
 */
function formatUpsellDownsell(data = {}) {
  const parts = [header("Upsell & Downsell Logic")];
 
  parts.push(field("Upsell", data.upsell));
  parts.push(field("Downsell", data.downsell));
 
  return parts.filter(Boolean).join("\n\n");
}
 
/**
 * Formats the full business kit into an ordered array of message strings —
 * one per module, ready to be sent sequentially via telegram.sendMessage.
 * @param {object} kit - parsed JSON object from claude.generateBusinessKit
 * @returns {string[]}
 */
function formatBusinessKit(kit = {}) {
  const modules = [
    formatFoundation(kit.foundation),
    formatProducts(kit.products),
    formatWebsiteCopy(kit.websiteCopy),
    formatMarketing(kit.marketing),
    formatAutomation(kit.automation),
    formatMonetization(kit.monetization),
  ];
 
  return modules.filter((m) => m && m.trim().length > 0);
}
 
/**
 * Formats the full Sales & Offer Pack into an ordered array of message
 * strings — one per module, ready to be sent sequentially via
 * telegram.sendMessage. Sent only after payment confirms.
 * @param {object} pack - parsed JSON object from claude.generateSalesOfferPack
 * @returns {string[]}
 */
function formatSalesOfferPack(pack = {}) {
  const modules = [
    formatOfferBreakdown(pack.offerBreakdown),
    formatSalesPageStructure(pack.salesPageStructure),
    formatEmailSequence(pack.emailSequence),
    formatUpsellDownsell(pack.upsellDownsell),
  ];
 
  return modules.filter((m) => m && m.trim().length > 0);
}
 
/**
 * Formats the FREE preview shown immediately after generation, before
 * payment — just the sales page headline/subheadline as a teaser, mirroring
 * how the landing page shows only the hero section pre-payment.
 * @param {object} pack - parsed JSON object from claude.generateSalesOfferPack
 * @returns {string} single message string (used with sendMessageWithButtons)
 */
function formatSalesPackPreview(pack = {}) {
  const sp = pack.salesPageStructure || {};
  const parts = [
    header("Your Sales Page Preview"),
    field("Headline", sp.headline),
    field("Subheadline", sp.subheadline),
    esc(
      "Everything else — the full offer breakdown, complete sales page copy, your 5-email launch sequence, and upsell/downsell logic — unlocks as soon as you pay."
    ),
  ];
  return parts.filter(Boolean).join("\n\n");
}
 
/**
 * Generic helper for handlers that just need a clean header + body message
 * (e.g. /help, /upgrade). Not tied to the business-kit shape.
 */
function formatSimpleMessage(title, bodyLines = []) {
  const parts = [header(title)];
  if (Array.isArray(bodyLines)) {
    parts.push(bulletList(bodyLines));
  } else {
    parts.push(esc(bodyLines));
  }
  return parts.filter(Boolean).join("\n\n");
}
 
module.exports = {
  esc,
  header,
  bulletList,
  field,
  DIVIDER,
  formatBusinessKit,
  formatFoundation,
  formatProducts,
  formatWebsiteCopy,
  formatMarketing,
  formatAutomation,
  formatMonetization,
  formatSimpleMessage,
  formatSalesOfferPack,
  formatSalesPackPreview,
};
