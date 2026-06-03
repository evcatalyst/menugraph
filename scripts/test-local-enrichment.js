const assert = require("assert");
const {
  dishTypeFor,
  ingredientTagsFor,
  normalizedDishName,
  optionsFromArgs,
  parseImageDimensions,
  selectMenus,
  textDishMentions,
} = require("./local-enrichment");

function pngFixture(width, height) {
  const buffer = Buffer.alloc(24);
  buffer.writeUInt8(0x89, 0);
  buffer.write("PNG", 1, 3, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function run() {
  assert.strictEqual(normalizedDishName("Fresh Lobster with Butter"), "lobster butter");
  assert.deepStrictEqual(ingredientTagsFor("Broiled lobster with drawn butter").sort(), ["butter", "lobster"]);
  assert.strictEqual(dishTypeFor("Oyster stew"), "seafood");

  const menu = {
    id: 42,
    uid: "cia:42",
    sourceKey: "cia",
    title: "Unknown dinner menu",
    sourceRecordId: "42",
  };
  const mentions = textDishMentions(
    menu,
    [
      "SOUPS",
      "Consomme Royal 35",
      "Broiled Lobster 1.25",
      "Telephone Plaza 1234",
      "Desserts",
      "Apple Pie .25",
    ].join("\n")
  );
  assert(mentions.some((record) => record.normalizedName.includes("lobster")));
  assert(mentions.some((record) => record.ingredientTags.includes("apple")));
  assert(!mentions.some((record) => /telephone/i.test(record.rawName)));

  const selected = selectMenus(
    [
      { uid: "nypl:1", sourceKey: "nypl", title: "Known", year: 1910, decade: "1910s" },
      { uid: "cia:2", sourceKey: "cia", title: "Unknown", year: null, decade: "unknown" },
    ],
    { source: "all", unknownOnly: true, limit: 10 },
    new Map()
  );
  assert.deepStrictEqual(selected.map((record) => record.uid), ["cia:2"]);

  const dims = parseImageDimensions(pngFixture(640, 480));
  assert.strictEqual(dims.width, 640);
  assert.strictEqual(dims.height, 480);
  assert.strictEqual(dims.mediaType, "image/png");

  const options = optionsFromArgs(["--fetch-cia-text", "--unknown-only", "--limit=12", "--image-limit=3", "--time-budget-min=1", "--menu-timeout-ms=9000", "--max-transcript-pages=4"]);
  assert.strictEqual(options.fetchCiaText, true);
  assert.strictEqual(options.unknownOnly, true);
  assert.strictEqual(options.limit, 12);
  assert.strictEqual(options.imageLimit, 3);
  assert.strictEqual(options.timeBudgetMs, 60000);
  assert.strictEqual(options.menuTimeoutMs, 9000);
  assert.strictEqual(options.maxTranscriptPages, 4);

  console.log("local enrichment tests passed");
}

run();
