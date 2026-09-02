// utils/offers.js
// Single source of truth for the four premium add-ons. Both /upgrade (the
// summary list) and the dedicated per-offer commands (/contentpack, etc.)
// read from this file, so pricing/copy only needs to be edited in one place.
//
// PLACEHOLDER PRICING: prices below are placeholders — update them once real
// prices are set on Payhip. checkoutUrlEnv names the env var that will hold
// the live Payhip checkout URL once it exists; until that env var is set,
// offerDetail.js shows a "coming soon" message instead of a broken link.

const OFFERS = [
  {
    slug: "content",
    command: "/contentpack",
    name: "Content Pack",
    price: "$19",
    tagline: "A full quarter of content, done for you.",
    includes: [
      "90-day content calendar (full quarter, not just 30 days)",
      "50 additional reel scripts across multiple formats",
      "Full caption library — 100+ ready-to-post captions",
      "Seasonal and trending content ideas for your niche",
      "Repurposing templates to turn one post into five",
    ],
    checkoutUrlEnv: "PAYHIP_CONTENT_URL",
  },
  {
    slug: "automation",
    command: "/automationpack",
    name: "Automation Pack",
    price: "$19",
    tagline: "Every workflow in your kit, ready to import.",
    includes: [
      "Client onboarding automation, ready to import",
      "Content scheduling automation, ready to import",
      "Sales funnel automation, ready to import",
      "Lead capture automation, ready to import",
      "Weekly operations checklist automation",
    ],
    checkoutUrlEnv: "PAYHIP_AUTOMATION_URL",
  },
  {
    slug: "website",
    command: "/websitepack",
    name: "Website Pack",
    price: "$19",
    tagline: "A complete multi-page site, written and SEO-ready.",
    includes: [
      "Full copy for every core page — Home, About, Services, Contact, FAQ",
      "SEO meta descriptions and title tags for every page",
      "Page-by-page structure guide",
      "Multiple call-to-action variations per page",
    ],
    checkoutUrlEnv: "PAYHIP_WEBSITE_URL",
  },
  {
    slug: "branding",
    command: "/brandingpack",
    name: "Branding Pack",
    price: "$19",
    tagline: "Your visual identity, defined in one sheet.",
    includes: [
      "Logo direction brief — style, mood, dos and don'ts",
      "Color palette with hex codes",
      "Typography system for headlines and body text",
      "One-page brand guideline sheet",
    ],
    checkoutUrlEnv: "PAYHIP_BRANDING_URL",
  },
];

function getOffer(slug) {
  return OFFERS.find((offer) => offer.slug === slug) || null;
}

module.exports = {
  OFFERS,
  getOffer,
};
