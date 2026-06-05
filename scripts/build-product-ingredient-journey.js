const fs = require("fs/promises");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "docs", "data", "product-evidence");
const SUMMARY_PATH = path.join(DATA_DIR, "summary.json");
const OUTPUT_PATH = path.join(DATA_DIR, "ingredient-journey.json");

const VERSION = 1;
const SELECTED_PRODUCTS = [
  "cheerios_original",
  "oreo_original_chocolate_sandwich_cookies",
  "poptarts_frosted_strawberry",
  "kraft_macaroni_and_cheese_original",
  "heinz_tomato_ketchup",
  "campbells_tomato_soup",
  "reeses_peanut_butter_cups",
  "mms_milk_chocolate",
  "doritos_nacho_cheese",
  "coca_cola_classic",
];

const OWNERSHIP_SOURCES = {
  mondelez_2012: {
    label: "Mondelez spin-off",
    sourceUrl:
      "https://ir.mondelezinternational.com/news-releases/news-release-details/mondelez-international-completes-spin-its-north-american-grocery/",
  },
  kraft_heinz_2015: {
    label: "Kraft Heinz merger",
    sourceUrl:
      "https://news.kraftheinzcompany.com/press-releases-details/2015/The-Kraft-Heinz-Company-Announces-Successful-Completion-of-the-Merger-between-Kraft-Foods-Group-and-HJ-Heinz-Holding-Corporation/default.aspx",
  },
  kellogg_split_2023: {
    label: "Kellogg split",
    sourceUrl:
      "https://newsroom.wkkellogg.com/2023-03-15-KELLOGG-COMPANY-UNVEILS-NAMES-FOR-GLOBAL-SNACKING-AND-NORTH-AMERICAN-CEREAL-BUSINESSES-FOLLOWING-PLANNED-SEPARATION",
  },
  mars_kellanova_2025: {
    label: "Mars acquires Kellanova",
    sourceUrl:
      "https://www.mars.com/en-be/news-and-stories/press-releases-statements/mars-completes-acquisition-of-kellanova",
  },
  campbell_rename_2024: {
    label: "Campbell name change",
    sourceUrl:
      "https://investor.thecampbellscompany.com/news-releases/news-release-details/shareholders-overwhelmingly-approve-change-company-name",
  },
  hershey_reese_1963: {
    label: "Hershey acquires Reese",
    sourceUrl:
      "https://www.thehersheycompany.com/content/hershey-corporate/en-us/home/about-us/the-company/history.html",
  },
};

const PRODUCT_SEEDS = {
  cheerios_original: {
    themes: ["whole grain oats", "sugar and sweeteners", "vitamin and mineral fortification", "allergen and gluten context"],
    trend: "Oat identity is stable; the label-review question is how sugar, fortification, and allergen language change across package eras.",
    ownership: [],
  },
  oreo_original_chocolate_sandwich_cookies: {
    themes: ["cocoa", "sugar and corn sweeteners", "vegetable oils", "lecithin and emulsifiers"],
    trend: "The high-value comparison is oils, sweeteners, and allergen language before and after the Kraft/Mondelez split.",
    ownership: [
      {
        year: 2012,
        owner: "Mondelez International",
        event: "Kraft Foods separated global snacks from North American grocery, placing Oreo/Nabisco snack evidence under Mondelez review.",
        sourceKey: "mondelez_2012",
      },
    ],
  },
  poptarts_frosted_strawberry: {
    themes: ["enriched flour", "fruit filling", "colors", "oils and shortening", "corn sweeteners"],
    trend: "Track fruit-filling wording, color additives, and oil/shortening language through Kellogg, Kellanova, and Mars-era packaging.",
    ownership: [
      {
        year: 2023,
        owner: "Kellanova",
        event: "Kellogg separated Kellanova from WK Kellogg Co; Pop-Tarts stayed with Kellanova.",
        sourceKey: "kellogg_split_2023",
      },
      {
        year: 2025,
        owner: "Mars",
        event: "Mars completed its acquisition of Kellanova; post-acquisition labels should be tracked as a new ownership era.",
        sourceKey: "mars_kellanova_2025",
      },
    ],
  },
  kraft_macaroni_and_cheese_original: {
    themes: ["wheat pasta", "cheese sauce mix", "dairy", "colors and color-source claims", "salt"],
    trend: "The key comparison is cheese sauce color language and dairy/wheat allergen presentation before and after Kraft Heinz.",
    ownership: [
      {
        year: 2015,
        owner: "Kraft Heinz",
        event: "Kraft Foods Group and H.J. Heinz completed their merger, creating a clear ownership checkpoint for Kraft label evidence.",
        sourceKey: "kraft_heinz_2015",
      },
    ],
  },
  heinz_tomato_ketchup: {
    themes: ["tomato concentrate", "vinegar", "sweeteners", "salt", "spices and natural flavor"],
    trend: "The high-value ingredient watchpoint is sweetener wording and tomato-concentrate language across pre- and post-Kraft Heinz labels.",
    ownership: [
      {
        year: 2015,
        owner: "Kraft Heinz",
        event: "Heinz entered the Kraft Heinz era after the 2015 Kraft/Heinz merger.",
        sourceKey: "kraft_heinz_2015",
      },
    ],
  },
  campbells_tomato_soup: {
    themes: ["tomato puree", "sweeteners", "wheat flour", "salt and sodium language", "flavoring"],
    trend: "Track tomato, sweetener, wheat, and sodium wording as Campbell evolves from soup-focused branding to a broader food company.",
    ownership: [
      {
        year: 2024,
        owner: "The Campbell's Company",
        event: "Shareholders approved changing the corporate name from Campbell Soup Company to The Campbell's Company.",
        sourceKey: "campbell_rename_2024",
      },
    ],
  },
  reeses_peanut_butter_cups: {
    themes: ["peanuts", "milk chocolate", "sugar", "cocoa butter and oils", "emulsifiers"],
    trend: "A strong candidate for ownership-linked review because Hershey acquired H.B. Reese Candy Company in 1963.",
    ownership: [
      {
        year: 1963,
        owner: "The Hershey Company",
        event: "Hershey acquired H.B. Reese Candy Company, creating the long-running Reese ownership baseline.",
        sourceKey: "hershey_reese_1963",
      },
    ],
  },
  mms_milk_chocolate: {
    themes: ["milk chocolate", "sugar", "colors", "lecithin", "cocoa"],
    trend: "Color and allergen language are the strongest current label-review targets; ownership is treated as stable Mars evidence unless future events are added.",
    ownership: [],
  },
  doritos_nacho_cheese: {
    themes: ["corn", "vegetable oils", "cheese seasoning", "colors", "flavor enhancers"],
    trend: "Track cheese-seasoning complexity, color additives, and flavor-enhancer language across Frito-Lay/PepsiCo package eras.",
    ownership: [],
  },
  coca_cola_classic: {
    themes: ["carbonated water", "sweeteners", "caramel color", "phosphoric acid", "natural flavors", "caffeine"],
    trend: "The label-review target is sweetener/caramel-color wording and nutrition panel changes, not product ownership.",
    ownership: [],
  },
};

function cleanValue(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function splitParts(value, limit = 6) {
  return cleanValue(value)
    .split(";")
    .map((part) => cleanValue(part))
    .filter(Boolean)
    .slice(0, limit);
}

function sourceLeadFromUrl(product, url, vintage = "", rank = 0) {
  if (!url) return null;
  let domain = "";
  try {
    domain = new URL(url).hostname.replace(/^www\./, "");
  } catch (error) {
    domain = "";
  }
  return {
    sourceUrl: url,
    sourceDomain: domain,
    vintage,
    rank,
    role: "candidate_package_photo_or_label_source",
    disclosure: "Open source and verify visible front, ingredient panel, date basis, manufacturer, and package size before promotion.",
  };
}

function productSourceLeads(product, photoRows) {
  const seen = new Set();
  const leads = [];
  const add = (lead) => {
    if (!lead?.sourceUrl || seen.has(lead.sourceUrl)) return;
    seen.add(lead.sourceUrl);
    leads.push(lead);
  };

  for (const row of photoRows.filter((item) => item.canonical_name === product.canonical_name && item.source_url)) {
    add({
      sourceUrl: row.source_url,
      sourceDomain: row.source_domain || "",
      sourceTitle: row.source_title || "",
      vintage: row.vintage_label || "",
      rank: Number(row.candidate_rank || 0),
      role: row.visible_photo_roles_guess || "candidate_package_photo",
      disclosure: row.ground_truth_fields_missing || row.promotion_blocker || "Verify visible label fields before promotion.",
      confidence: Number(row.confidence || 0),
    });
  }

  splitParts(product.best_source_urls || product.starter_image_urls || product.starter_search_urls, 8).forEach((url, index) => {
    add(sourceLeadFromUrl(product, url, "", index));
  });
  return leads.slice(0, 8);
}

function vintageScore(status, sourceCount) {
  const base = {
    ground_truth_ready: 4,
    manual_review_ready: 3,
    candidate_found: 2,
    candidate_needs_panel: 2,
    candidate_needs_transcription: 2,
    candidate_needs_archive: 1,
    no_source: 0,
  }[status] ?? 0;
  return base + Math.min(3, Number(sourceCount || 0));
}

function buildTimeline(product, sourceLeads, vintages, themes) {
  return vintages.map((vintage) => {
    const status = product.vintage_statuses?.[vintage]?.status || "unknown";
    const sourceCount = Number(product.vintage_statuses?.[vintage]?.source_count || 0);
    const leads = sourceLeads.filter((lead) => !lead.vintage || lead.vintage === vintage).slice(0, 3);
    return {
      vintage,
      status,
      sourceCount,
      evidenceScore: vintageScore(status, sourceCount),
      ingredientSignals: themes.slice(0, vintage === "current_2020s" ? 5 : 4),
      photoEvidence: leads,
      nextAction:
        status === "no_source"
          ? "Find a source-attributable package photo for this era."
          : "Open candidate photos and promote only rows with readable ingredient or manufacturer evidence.",
    };
  });
}

function sourceForOwnership(event) {
  const source = OWNERSHIP_SOURCES[event.sourceKey] || {};
  return {
    ...event,
    sourceLabel: source.label || "",
    sourceUrl: source.sourceUrl || "",
  };
}

function buildProductJourney(product, summary) {
  const seed = PRODUCT_SEEDS[product.canonical_name] || {};
  const themes = seed.themes || [product.category, product.subcategory].map(cleanValue).filter(Boolean);
  const sourceLeads = productSourceLeads(product, summary.photo_evidence || []);
  const ownership = (seed.ownership || []).map(sourceForOwnership);
  const timeline = buildTimeline(product, sourceLeads, summary.vintages || [], themes);
  const evidencePhotoCount = timeline.reduce((sum, era) => sum + era.photoEvidence.length, 0);
  return {
    canonicalName: product.canonical_name,
    displayName: product.display_name,
    brand: product.brand,
    category: product.category,
    subcategory: product.subcategory,
    collectionTrack: product.collection_track,
    productCandidateCount: Number(product.product_candidate_count || 0),
    photoEvidenceRows: Number(product.photo_evidence_rows || 0),
    slotCoveragePct: Number(product.slot_coverage_pct || 0),
    ingredientThemes: themes,
    trendSummary: seed.trend || "Ingredient journey requires package-panel transcription before trend claims can be promoted.",
    ownershipMilestones: ownership,
    timeline,
    evidencePhotoCount,
    evidenceStatus:
      evidencePhotoCount > 0
        ? "candidate_photo_links_ready"
        : product.photo_evidence_rows
          ? "photo_rows_need_source_review"
          : "needs_source_collection",
  };
}

async function buildProductIngredientJourney(options = {}) {
  const summary = options.summary || (await readJson(SUMMARY_PATH));
  const byId = new Map((summary.products || []).map((product) => [product.canonical_name, product]));
  const products = SELECTED_PRODUCTS.map((id) => byId.get(id)).filter(Boolean).map((product) => buildProductJourney(product, summary));
  const generatedAt = new Date().toISOString();
  const payload = {
    version: VERSION,
    generatedAt,
    sourceFile: "data/product-evidence/summary.json",
    view: "ingredient_journey",
    scope: {
      productRows: summary.products?.length || 0,
      selectedProducts: products.length,
      note: "Product ingredient journeys are evidence-first. Ingredient themes are review targets until source-attributable label photos are transcribed.",
      recipeJourneyStatus: "not_published_until_recipe_rows_are_collected",
    },
    metrics: {
      products: products.length,
      ownershipMilestones: products.reduce((sum, product) => sum + product.ownershipMilestones.length, 0),
      evidencePhotoLinks: products.reduce((sum, product) => sum + product.evidencePhotoCount, 0),
      ingredientThemes: new Set(products.flatMap((product) => product.ingredientThemes)).size,
    },
    ownershipSources: OWNERSHIP_SOURCES,
    products,
  };
  if (!options.dryRun) {
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }
  return payload;
}

if (require.main === module) {
  buildProductIngredientJourney()
    .then((payload) => {
      console.log(
        `Wrote ingredient journey for ${payload.metrics.products} products, ${payload.metrics.ownershipMilestones} ownership milestones, ${payload.metrics.evidencePhotoLinks} evidence link(s)`
      );
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = {
  buildProductIngredientJourney,
  buildTimeline,
  selectedProducts: SELECTED_PRODUCTS,
  productSourceLeads,
};
