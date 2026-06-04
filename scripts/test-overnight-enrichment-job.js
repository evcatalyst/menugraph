const assert = require("assert");
const {
  STORAGE_LIGHT_EXTERNAL_IMAGE_CONCURRENCY,
  STORAGE_LIGHT_EXTERNAL_IMAGE_LIMIT,
  STORAGE_LIGHT_EXTERNAL_IMAGE_TIMEOUT_MS,
  STORAGE_LIGHT_MIN_FREE_MB,
  isStorageLight,
  recipeLimitForStorageMode,
  storagePreflightForArgs,
} = require("./overnight-enrichment-job");

assert.strictEqual(isStorageLight(["--storage-light"]), true);
assert.strictEqual(isStorageLight(["--metadata-only"]), true);
assert.strictEqual(isStorageLight(["--run-local-ocr"]), false);

const storageLightPreflight = storagePreflightForArgs(["--storage-light"], "test overnight");
assert.strictEqual(storageLightPreflight.minFreeMb, STORAGE_LIGHT_MIN_FREE_MB);
assert.strictEqual(storageLightPreflight.label, "test overnight");
assert.strictEqual(STORAGE_LIGHT_EXTERNAL_IMAGE_LIMIT, 1200);
assert.strictEqual(STORAGE_LIGHT_EXTERNAL_IMAGE_CONCURRENCY, 6);
assert.strictEqual(STORAGE_LIGHT_EXTERNAL_IMAGE_TIMEOUT_MS, 8000);

const explicitPreflight = storagePreflightForArgs(["--storage-light", "--min-free-mb=64"], "test overnight");
assert.strictEqual(explicitPreflight.minFreeMb, 64);

const existingRecipeBridge = {
  summary: {
    clusters: 40000,
    dishLinks: 40000,
  },
};

assert.strictEqual(recipeLimitForStorageMode(["--storage-light", "--recipe-cluster-limit=80000"], existingRecipeBridge, "clusters", 500), 40000);
assert.strictEqual(
  recipeLimitForStorageMode(["--storage-light", "--allow-recipe-growth", "--recipe-cluster-limit=80000"], existingRecipeBridge, "clusters", 500),
  80000
);
assert.strictEqual(recipeLimitForStorageMode(["--recipe-dish-link-limit=50000"], existingRecipeBridge, "dishLinks", 1600), 50000);

console.log("overnight enrichment job tests passed");
