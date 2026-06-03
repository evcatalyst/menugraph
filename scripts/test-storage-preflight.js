const assert = require("assert");
const path = require("path");
const {
  assertStoragePreflight,
  bytesFromMb,
  formatBytes,
  lowStorageMessage,
  optionsFromArgs,
  storagePreflight,
} = require("./storage-preflight");

const oneMb = 1024 * 1024;

assert.strictEqual(bytesFromMb(2), 2 * oneMb);
assert.strictEqual(formatBytes(512), "512 B");
assert.strictEqual(formatBytes(oneMb), "1.0 MB");

const ok = storagePreflight({
  targetDir: "/tmp",
  minFreeBytes: oneMb,
  label: "test enrichment",
  statfs: () => ({ bavail: 2, bsize: oneMb }),
});
assert.strictEqual(ok.ok, true);
assert.strictEqual(ok.availableBytes, 2 * oneMb);
assert.strictEqual(ok.minFreeBytes, oneMb);

const low = storagePreflight({
  targetDir: "/tmp",
  minFreeBytes: 3 * oneMb,
  label: "test enrichment",
  statfs: () => ({ bavail: 2, bsize: oneMb }),
});
assert.strictEqual(low.ok, false);
assert(lowStorageMessage(low).includes("Low disk space for test enrichment"));
assert.throws(() => assertStoragePreflight({
  targetDir: "/tmp",
  minFreeBytes: 3 * oneMb,
  label: "test enrichment",
  statfs: () => ({ bavail: 2, bsize: oneMb }),
}), /Low disk space/);

const skipped = storagePreflight({
  enabled: false,
  targetDir: "/tmp",
  minFreeBytes: oneMb,
  label: "skipped check",
});
assert.strictEqual(skipped.ok, true);
assert.strictEqual(skipped.skipped, true);
assert.strictEqual(skipped.availableBytes, null);

const parsed = optionsFromArgs(
  ["--min-free-mb=256", "--storage-dir=/tmp/menugraph-check", "--skip-storage-preflight"],
  { targetDir: "/repo", minFreeMb: 1024, label: "overnight" }
);
assert.strictEqual(parsed.enabled, false);
assert.strictEqual(parsed.minFreeMb, 256);
assert.strictEqual(parsed.targetDir, path.resolve("/tmp/menugraph-check"));
assert.strictEqual(parsed.label, "overnight");

const zeroThreshold = optionsFromArgs(["--min-free-mb=0"], { minFreeMb: 1024 });
assert.strictEqual(zeroThreshold.minFreeMb, 0);

console.log("storage preflight tests passed");
