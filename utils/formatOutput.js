// utils/formatOutput.js

const MD_ESCAPE_RE = /([_*\[\]()~`>#+\-=|{}.!\\])/g;

function esc(text) {
  if (text === null || text === undefined) return "";
  return String(text).replace(MD_ESCAPE_RE, "\\$1");
}

function header(title) {
  return `*${esc(`🔹 ${title.toUpperCase()}`)}*`;
}

function bulletList(items = []) {
  return items
    .filter(Boolean)
    .map((item) => `• ${esc(item)}`)
    .join("\n");
}

function field(label, value) {
  if (!value) return "";
  return `*${esc(label)}:*\n${esc(value)}`;
}

const DIVIDER = "─────────────────────";

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
       parts.push("*Automation\\-Ready Offers:*\n" + bulletList(data.automationOffers));
  }
  if (data.upsellsAndBundles?.length) {
    parts.push("*Upsells \\& Bundles:*\n" + bulletList(data.upsellsAndBundles));
  }
  return parts.filter(Boolean).join("\n\n");
}

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

function formatMarketing(data = {}) {
  const parts = [header("Marketing System")];
  if (data.contentCalendar30Day?.length) {
    const days = data.contentCalendar30Day
      .map((item, i) => `Day ${i + 1}: ${esc(item)}`)
      .join("\n");
        parts.push("*30\\-Day Content Calendar:*\n" + days);
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

function formatAutomation(data = {}) {
  const parts = [header("Automation Workflows")];
  parts.push(field("Client Onboarding Workflow", data.clientOnboarding));
  parts.push(field("Content Automation Workflow", data.contentAutomation));
  parts.push(field("Sales Funnel Automation", data.salesFunnelAutomation));
  parts.push(field("Lead Capture Automation", data.leadCaptureAutomation));
  parts.push(field("Weekly Operations Automation", data.weeklyOperations));
  return parts.filter(Boolean).join("\n\n");
}

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
};
