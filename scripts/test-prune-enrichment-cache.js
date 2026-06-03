const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  collectPruneCandidates,
  formatBytes,
  optionsFromArgs,
  pruneCache,
} = require("./prune-enrichment-cache");

function writeFile(filePath, contents, mtimeOffsetMs = 0) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
  const time = new Date(Date.now() + mtimeOffsetMs);
  fs.utimesSync(filePath, time, time);
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function run() {
  assert.strictEqual(formatBytes(0), "0 B");
  assert.strictEqual(formatBytes(1536), "1.5 KB");

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "menugraph-prune-"));
  const cacheDir = path.join(tempRoot, ".cache", "enrichment");
  try {
    writeFile(path.join(cacheDir, "transcripts", "cia_1.txt"), "soups\nconsomme royal\n");
    writeFile(path.join(cacheDir, "transcripts", "nested", "cia_2.txt"), "lobster 1.25\n");
    writeFile(path.join(cacheDir, "overnight-status.json"), "{}\n");
    writeFile(path.join(cacheDir, "overnight-current.json"), "{}\n");
    writeFile(path.join(cacheDir, "manual-note.txt"), "preserve\n");

    for (let index = 0; index < 5; index += 1) {
      writeFile(path.join(cacheDir, `overnight-2026-06-0${index + 1}.log`), `log ${index}\n`, index * 1000);
    }

    const candidates = collectPruneCandidates({ cacheDir, keepLogs: 2 });
    assert.strictEqual(candidates.filter((candidate) => candidate.kind === "transcript").length, 2);
    assert.strictEqual(candidates.filter((candidate) => candidate.kind === "overnight_log").length, 3);
    assert(!candidates.some((candidate) => candidate.relativePath === "overnight-status.json"));
    assert(!candidates.some((candidate) => candidate.relativePath === "overnight-current.json"));

    const dryRun = pruneCache({ cacheDir, keepLogs: 2, dryRun: true });
    assert.strictEqual(dryRun.filesDeleted, 0);
    assert.strictEqual(dryRun.filesMatched, 5);
    assert.strictEqual(dryRun.transcriptsMatched, 2);
    assert.strictEqual(dryRun.logsMatched, 3);
    assert.strictEqual(exists(path.join(cacheDir, "transcripts", "cia_1.txt")), true);

    const summary = pruneCache({ cacheDir, keepLogs: 2 });
    assert.strictEqual(summary.filesDeleted, 5);
    assert.strictEqual(summary.transcriptsDeleted, 2);
    assert.strictEqual(summary.logsDeleted, 3);
    assert.strictEqual(exists(path.join(cacheDir, "transcripts", "cia_1.txt")), false);
    assert.strictEqual(exists(path.join(cacheDir, "transcripts", "nested", "cia_2.txt")), false);
    assert.strictEqual(exists(path.join(cacheDir, "overnight-status.json")), true);
    assert.strictEqual(exists(path.join(cacheDir, "overnight-current.json")), true);
    assert.strictEqual(exists(path.join(cacheDir, "manual-note.txt")), true);
    assert.strictEqual(exists(path.join(cacheDir, "overnight-2026-06-04.log")), true);
    assert.strictEqual(exists(path.join(cacheDir, "overnight-2026-06-05.log")), true);
    assert.strictEqual(exists(path.join(cacheDir, "overnight-2026-06-01.log")), false);

    const options = optionsFromArgs(["--cache-dir=/tmp/example", "--dry-run", "--no-logs", "--keep-logs=12"]);
    assert.strictEqual(options.cacheDir, "/tmp/example");
    assert.strictEqual(options.dryRun, true);
    assert.strictEqual(options.pruneLogs, false);
    assert.strictEqual(options.keepLogs, 12);

    console.log("prune enrichment cache tests passed");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

run();
