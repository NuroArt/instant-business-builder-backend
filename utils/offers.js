// utils/offers.js
// Single source of truth for the four premium add-ons. Both /upgrade (the
// summary list) and the dedicated per-offer commands (/contentpack, etc.)
// read from this file. Each offer now maps to a real Stripe price (created
// dynamically per purchase, tagged with the buyer's chatId) and a real file
// that gets delivered automatically via Telegram once payment is confirmed.

const OFFERS = [
  {
    slug: "content",
    command: "/contentpack",
    name: "Content Pack",
    price: "$19",
    priceCents: 1900,
    tagline: "A full quarter of content, done for you.",
    includes: [
      "90-day content calendar (full quarter, not just 30 days)",
      "50 additional reel scripts across multiple formats",
      "Full caption library — 100+ ready-to-post captions",
      "Seasonal and trending content ideas for your niche",
      "Repurposing templates to turn one post into five",
    ],
    fileName: "NuroWorks-Content-Pack.docx",
  },
  {
    slug: "automation",
    command: "/automationpack",
    name: "Automation Pack",
    price: "$19",
    priceCents: 1900,
    tagline: "Every workflow in your kit, ready to import.",
    includes: [
      "Client onboarding automation, ready to import",
      "Content scheduling automation, ready to import",
      "Sales funnel automation, ready to import",
      "Lead capture automation, ready to import",
      "Weekly operations checklist automation",
    ],
    fileName: "NuroWorks-Automation-Pack.docx",
  },
  {
    slug: "website",
    command: "/websitepack",
    name: "Website Pack",
    price: "$19",
    priceCents: 1900,
    tagline: "A complete multi-page site, written and SEO-ready.",
    includes: [
      "Full copy for every core page — Home, About, Services, Contact, FAQ",
      "SEO meta descriptions and title tags for every page",
      "Page-by-page structure guide",
      "Multiple call-to-action variations per page",
    ],
    fileName: "NuroWorks-Website-Pack.docx",
  },
  {
    slug: "branding",
    command: "/brandingpack",
    name: "Branding Pack",
    price: "$19",
    priceCents: 1900,
    tagline: "Your visual identity, defined in one sheet.",
    includes: [
      "Logo direction brief — style, mood, dos and don'ts",
      "Color palette with hex codes",
      "Typography system for headlines and body text",
      "One-page brand guideline sheet",
    ],
    fileName: "NuroWorks-Branding-Pack.docx",
  },
];

function getOffer(slug) {
  return OFFERS.find((offer) => offer.slug === slug) || null;
}

module.exports = {
  OFFERS,
  getOffer,
};
