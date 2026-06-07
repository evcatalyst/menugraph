const fs = require("fs");
const path = require("path");
const {
  countBy,
  normalizeText,
  parseCsv,
  publicArtifactRef,
  readJson,
  shortHash,
  slug,
  summaryPath,
  writeCsv,
  writeJson,
} = require("./ingredient-ocr-pipeline-utils");

const root = path.join(__dirname, "..");
const priorityJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_source_priority.json");
const photoQueuePath = path.join(root, "docs/data/product-evidence/exports/photo_proof_upgrade_queue.csv");
const reviewJsonPath = path.join(root, "docs/data/product-evidence/confection_wrapper_review_queue.json");
const reviewCsvPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_review_queue.csv");
const runbookPath = path.join(root, "docs/data/product-evidence/exports/confection_wrapper_review_runbook.md");
const generatedAt = "2026-06-08T00:55:00Z";
const archiveDomain = "www.candywrapperarchive.com";

function sourceUrl(row = {}) {
  return row.source_url || row.url || row.source_photo_url || "";
}

function sourceTitle(row = {}) {
  return row.source_title || row.title || "Candy Wrapper Archive source";
}

function isArchiveRow(row = {}) {
  return /candywrapperarchive\.com/i.test(`${row.source_domain || ""} ${row.source_owner || ""} ${sourceUrl(row)}`);
}

function linkedVintage(row = {}) {
  return normalizeText(row.vintage_label || row.version_label || row.vintage || row.linked_vintages);
}

function unique(values) {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

function taskTypeFor(url, hasExistingRows) {
  if (!url) return "targeted_archive_search";
  if (/\/candy-collector\//.test(url)) return "item_page_review";
  if (/\/candy-collection\//.test(url)) return hasExistingRows ? "collection_page_existing_lead" : "collection_page_likely_lead";
  return hasExistingRows ? "archive_source_review" : "archive_source_hunt";
}

function priorityScore(target, existingRows, taskType) {
  const tierScore = {
    existing_lineage_source: 130,
    existing_source_lead: 115,
    collection_page_likely: 90,
    source_search_priority: 70,
  }[target.priority_tier] || 50;
  const typeScore = {
    item_page_review: 18,
    collection_page_existing_lead: 14,
    archive_source_review: 10,
    collection_page_likely_lead: 5,
    targeted_archive_search: 0,
  }[taskType] || 0;
  return tierScore + typeScore + Math.min(existingRows.length * 3, 18);
}

function extractionChecklist(taskType) {
  const base = [
    "record source URL, title, owner/publisher, access date, and rights note",
    "record claimed product date/decade and whether that date is from page metadata, title, caption, or inference",
    "record visible product name, variant, manufacturer/distributor, net weight, and package format",
    "classify whether wrapper front, back, side, nutrition panel, ingredient panel, barcode, lot/date cue, or only collection-page context is visible",
  ];
  if (taskType === "item_page_review") {
    base.push("capture private source-page screenshot and wrapper crop if rights are not clear for publication");
  } else if (/collection_page/.test(taskType)) {
    base.push("select item-level wrapper pages or image records by decade before OCR; do not OCR the collection index as a label");
  } else {
    base.push("run targeted site searches and attach the strongest source URL before capture/OCR");
  }
  base.push("promote to panel OCR only if ingredient or nutrition text is visibly readable");
  return base.join("; ");
}

function reviewGoal(taskType) {
  if (taskType === "item_page_review") {
    return "Review this item-level wrapper page for decade, weight, maker, photo role, rights, and whether any label panel is readable.";
  }
  if (taskType === "collection_page_existing_lead") {
    return "Use this collection page as the first wrapper-lineage index; select item-level records before capture/OCR.";
  }
  if (taskType === "collection_page_likely_lead") {
    return "Open the likely collection page before broader web search; create item-level evidence rows from matching wrappers.";
  }
  return "Run targeted Candy Wrapper Archive searches and attach source-attributable wrapper lineage leads.";
}

function buildExistingTasks(targets, archiveRows) {
  const targetByProduct = new Map(targets.map((target) => [target.product_id, target]));
  const grouped = new Map();
  for (const row of archiveRows) {
    const url = sourceUrl(row);
    const key = `${row.product_id}::${url || sourceTitle(row)}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }

  return [...grouped.values()].map((rows) => {
    const first = rows[0] || {};
    const target = targetByProduct.get(first.product_id) || {};
    const url = sourceUrl(first);
    const taskType = taskTypeFor(url, true);
    const vintages = unique(rows.map(linkedVintage));
    const titles = unique(rows.map(sourceTitle));
    const lanes = unique(rows.map((row) => row.display_lane || row.ocr_gap_category));
    return {
      task_id: `cwa_${slug(first.product_id)}_${shortHash(url || titles.join("|"), 10)}`,
      product_id: first.product_id,
      product_name: first.product_name,
      category: first.category || target.category || "candy",
      priority_tier: target.priority_tier || "existing_source_lead",
      task_type: taskType,
      priority_score: priorityScore(target, rows, taskType),
      source_domain: archiveDomain,
      source_url: url,
      source_title: titles[0] || "Candy Wrapper Archive source",
      observed_source_rows: rows.length,
      linked_vintage_slots: vintages.join(";"),
      existing_display_lanes: lanes.join(";"),
      review_goal: reviewGoal(taskType),
      extraction_checklist: extractionChecklist(taskType),
      ingredient_claim_rule: "Wrapper-front lineage can support package story only; ingredient claims require readable panel OCR, corrected transcription, and manual verification.",
      publication_rule: "Link out first; keep screenshots/crops private unless rights are clear.",
      next_pipeline_action: "Create or update evidence artifact rows, then route readable ingredient/nutrition panels into panel_capture_ocr_queue.",
      search_queries: target.search_queries || "",
    };
  });
}

function buildMissingTasks(targets, existingTasks) {
  const existingKeys = new Set(existingTasks.map((task) => `${task.product_id}::${task.source_url}`));
  const tasks = [];
  for (const target of targets) {
    const urls = unique(String(target.known_candy_wrapper_archive_urls || "").split(";"));
    if (target.candy_wrapper_archive_rows > 0) continue;
    for (const url of urls) {
      const key = `${target.product_id}::${url}`;
      if (existingKeys.has(key)) continue;
      const taskType = taskTypeFor(url, false);
      tasks.push({
        task_id: `cwa_${slug(target.product_id)}_${shortHash(url || target.product_name, 10)}`,
        product_id: target.product_id,
        product_name: target.product_name,
        category: target.category || "candy",
        priority_tier: target.priority_tier,
        task_type: taskType,
        priority_score: priorityScore(target, [], taskType),
        source_domain: archiveDomain,
        source_url: url,
        source_title: `${target.product_name} Candy Wrapper Archive collection lead`,
        observed_source_rows: 0,
        linked_vintage_slots: "",
        existing_display_lanes: "",
        review_goal: reviewGoal(taskType),
        extraction_checklist: extractionChecklist(taskType),
        ingredient_claim_rule: "Collection-page leads are package-lineage candidates only until item-level panel evidence is reviewed.",
        publication_rule: "Link out first; keep screenshots/crops private unless rights are clear.",
        next_pipeline_action: "Confirm matching item records, then add source-attributable evidence artifacts by decade.",
        search_queries: target.search_queries || "",
      });
    }
    if (!urls.length) {
      const taskType = "targeted_archive_search";
      tasks.push({
        task_id: `cwa_${slug(target.product_id)}_${shortHash(target.search_queries || target.product_name, 10)}`,
        product_id: target.product_id,
        product_name: target.product_name,
        category: target.category || "candy",
        priority_tier: target.priority_tier,
        task_type: taskType,
        priority_score: priorityScore(target, [], taskType),
        source_domain: archiveDomain,
        source_url: "",
        source_title: `${target.product_name} Candy Wrapper Archive targeted search`,
        observed_source_rows: 0,
        linked_vintage_slots: "",
        existing_display_lanes: "",
        review_goal: reviewGoal(taskType),
        extraction_checklist: extractionChecklist(taskType),
        ingredient_claim_rule: "Search results are source leads only until source-attributable wrapper and label evidence is reviewed.",
        publication_rule: "Link out first; keep screenshots/crops private unless rights are clear.",
        next_pipeline_action: "Attach the best source URL, then classify photo role and panel readability.",
        search_queries: target.search_queries || "",
      });
    }
  }
  return tasks;
}

function buildTasks(priorityManifest, photoRows) {
  const targets = priorityManifest.top_targets || [];
  const archiveRows = photoRows.filter(isArchiveRow);
  const existingTasks = buildExistingTasks(targets, archiveRows);
  const missingTasks = buildMissingTasks(targets, existingTasks);
  return [...existingTasks, ...missingTasks].sort((a, b) => (
    b.priority_score - a.priority_score
    || String(a.product_name).localeCompare(String(b.product_name))
    || String(a.task_id).localeCompare(String(b.task_id))
  ));
}

function renderRunbook(manifest) {
  const lines = [
    "# Confection Wrapper Review Queue",
    "",
    `Generated: ${manifest.generated_at}`,
    "",
    "Candy Wrapper Archive is a high-yield source for candy wrapper lineage. Use it to build product stories first: decade, wrapper design, package format, net weight, manufacturer/distributor, and source provenance.",
    "",
    "Do not treat wrapper-front photos as ingredient evidence. Ingredient claims require a readable ingredient/nutrition panel, candidate OCR, corrected transcription, reviewer attribution, and manual verification.",
    "",
    "## Totals",
    "",
    `- Review tasks: ${manifest.totals.review_tasks}`,
    `- Products: ${manifest.totals.products}`,
    `- Existing source tasks: ${manifest.totals.existing_source_tasks}`,
    `- Likely collection tasks: ${manifest.totals.likely_collection_tasks}`,
    `- Search tasks: ${manifest.totals.search_tasks}`,
    "",
    "## First Tasks",
    "",
  ];
  for (const task of manifest.first_tasks.slice(0, 12)) {
    lines.push(`- ${task.product_name}: ${task.task_type}; ${task.source_url || task.search_queries}; ${task.review_goal}`);
  }
  return `${lines.join("\n")}\n`;
}

function buildManifest(tasks) {
  const existingSourceTasks = tasks.filter((task) => Number(task.observed_source_rows) > 0);
  return {
    schema_version: "confection_wrapper_review_queue.v1",
    generated_at: generatedAt,
    source_domain: archiveDomain,
    public_policy: {
      wrapper_lineage_first: true,
      ingredient_claims_blocked_without_panel_review: true,
      external_images_link_only_unless_rights_clear: true,
      private_paths_committed: false,
    },
    totals: {
      review_tasks: tasks.length,
      products: new Set(tasks.map((task) => task.product_id)).size,
      existing_source_tasks: existingSourceTasks.length,
      existing_source_rows_grouped: existingSourceTasks.reduce((sum, task) => sum + Number(task.observed_source_rows || 0), 0),
      item_page_tasks: tasks.filter((task) => task.task_type === "item_page_review").length,
      collection_page_tasks: tasks.filter((task) => /collection_page/.test(task.task_type)).length,
      likely_collection_tasks: tasks.filter((task) => task.task_type === "collection_page_likely_lead").length,
      search_tasks: tasks.filter((task) => task.task_type === "targeted_archive_search").length,
    },
    task_types: countBy(tasks, "task_type"),
    priority_tiers: countBy(tasks, "priority_tier"),
    first_tasks: tasks.slice(0, 16),
    artifacts: {
      review_queue_json: publicArtifactRef(reviewJsonPath),
      review_queue_csv: publicArtifactRef(reviewCsvPath),
      runbook_markdown: publicArtifactRef(runbookPath),
    },
    tasks,
  };
}

function main() {
  const priorityManifest = readJson(priorityJsonPath, {});
  const photoRows = fs.existsSync(photoQueuePath) ? parseCsv(fs.readFileSync(photoQueuePath, "utf8")) : [];
  const tasks = buildTasks(priorityManifest, photoRows);
  const manifest = buildManifest(tasks);
  const summary = readJson(summaryPath, {});
  summary.confection_wrapper_review_queue_summary = {
    generated_at: manifest.generated_at,
    source_domain: manifest.source_domain,
    public_policy: manifest.public_policy,
    totals: manifest.totals,
    task_types: manifest.task_types,
    priority_tiers: manifest.priority_tiers,
    first_tasks: manifest.first_tasks.slice(0, 8),
    artifacts: manifest.artifacts,
  };

  writeJson(reviewJsonPath, manifest);
  writeCsv(reviewCsvPath, [
    "task_id",
    "product_id",
    "product_name",
    "category",
    "priority_tier",
    "task_type",
    "priority_score",
    "source_domain",
    "source_url",
    "source_title",
    "observed_source_rows",
    "linked_vintage_slots",
    "existing_display_lanes",
    "review_goal",
    "extraction_checklist",
    "ingredient_claim_rule",
    "publication_rule",
    "next_pipeline_action",
    "search_queries",
  ], tasks);
  fs.mkdirSync(path.dirname(runbookPath), { recursive: true });
  fs.writeFileSync(runbookPath, renderRunbook(manifest));
  writeJson(summaryPath, summary);

  console.log(JSON.stringify({
    review_tasks: manifest.totals.review_tasks,
    products: manifest.totals.products,
    existing_source_tasks: manifest.totals.existing_source_tasks,
    review_queue_csv: manifest.artifacts.review_queue_csv,
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildTasks,
  taskTypeFor,
};
