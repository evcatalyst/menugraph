const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { pruneCache } = require("./prune-enrichment-cache");
const {
  DEFAULT_MIN_FREE_MB,
  assertStoragePreflight,
  optionsFromArgs: storagePreflightOptionsFromArgs,
} = require("./storage-preflight");

const ROOT_DIR = path.join(__dirname, "..");
const CACHE_DIR = path.join(ROOT_DIR, ".cache", "enrichment");
const STORAGE_LABEL = "overnight enrichment launcher";

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  let cachePrune = null;
  try {
    cachePrune = pruneCache({
      cacheDir: CACHE_DIR,
      keepLogs: 5,
      pruneLogs: true,
      pruneTranscripts: true,
    });
  } catch (error) {
    cachePrune = { error: error.message };
    console.warn(`Cache prune failed; continuing overnight launch: ${error.message}`);
  }
  const storagePreflight = assertStoragePreflight(
    storagePreflightOptionsFromArgs(process.argv.slice(2), {
      targetDir: ROOT_DIR,
      minFreeMb: DEFAULT_MIN_FREE_MB,
      label: STORAGE_LABEL,
    })
  );
  const logPath = path.join(CACHE_DIR, `overnight-${stamp()}.log`);
  const statusPath = path.join(CACHE_DIR, "overnight-status.json");
  const currentPath = path.join(CACHE_DIR, "overnight-current.json");
  const logFd = fs.openSync(logPath, "a");
  const args = [path.join(__dirname, "overnight-enrichment-job.js"), ...process.argv.slice(2)];
  const child = spawn(process.execPath, args, {
    cwd: ROOT_DIR,
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  child.unref();
  const payload = {
    pid: child.pid,
    startedAt: new Date().toISOString(),
    logPath,
    statusPath,
    cachePrune,
    storagePreflight,
    args: process.argv.slice(2),
  };
  fs.writeFileSync(currentPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(payload, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
