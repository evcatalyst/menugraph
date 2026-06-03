const fs = require("fs");
const path = require("path");

const DEFAULT_MIN_FREE_MB = 1024;

function hasFlag(args, name) {
  return args.includes(`--${name}`);
}

function argValue(args, name, fallback = null) {
  const prefix = `--${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function bytesFromMb(value, fallbackMb = DEFAULT_MIN_FREE_MB) {
  const mb = Number(value);
  const safeMb = Number.isFinite(mb) && mb >= 0 ? mb : fallbackMb;
  return Math.round(safeMb * 1024 * 1024);
}

function availableBytesForPath(targetDir, statfs = fs.statfsSync) {
  const stats = statfs(targetDir);
  const blocks = Number(stats.bavail ?? stats.bfree ?? 0);
  const blockSize = Number(stats.bsize ?? stats.frsize ?? 0);
  return blocks * blockSize;
}

function storagePreflight(options = {}) {
  const targetDir = path.resolve(options.targetDir || process.cwd());
  const enabled = options.enabled !== false;
  const minFreeBytes = Number.isFinite(options.minFreeBytes)
    ? Math.max(0, Number(options.minFreeBytes))
    : bytesFromMb(options.minFreeMb, DEFAULT_MIN_FREE_MB);
  const label = options.label || "MenuGraph enrichment";

  if (!enabled) {
    return {
      ok: true,
      skipped: true,
      label,
      targetDir,
      minFreeBytes,
      minFreeFormatted: formatBytes(minFreeBytes),
      availableBytes: null,
      availableFormatted: "unknown",
    };
  }

  const availableBytes = availableBytesForPath(targetDir, options.statfs);
  const ok = availableBytes >= minFreeBytes;
  return {
    ok,
    skipped: false,
    label,
    targetDir,
    minFreeBytes,
    minFreeFormatted: formatBytes(minFreeBytes),
    availableBytes,
    availableFormatted: formatBytes(availableBytes),
  };
}

function lowStorageMessage(result) {
  return [
    `Low disk space for ${result.label}: ${result.availableFormatted} available, ${result.minFreeFormatted} required.`,
    "Free local storage, run npm run enrich:cache:prune, reduce the batch size, or pass --min-free-mb=<MB> only if you accept the risk.",
  ].join(" ");
}

function assertStoragePreflight(options = {}) {
  const result = storagePreflight(options);
  if (!result.ok) {
    const error = new Error(lowStorageMessage(result));
    error.code = "MENUGRAPH_LOW_DISK";
    error.storagePreflight = result;
    throw error;
  }
  return result;
}

function optionsFromArgs(args = process.argv.slice(2), defaults = {}) {
  const fallbackMb = Number.isFinite(Number(defaults.minFreeMb)) ? Number(defaults.minFreeMb) : DEFAULT_MIN_FREE_MB;
  const envMinFreeMb = process.env.MENUGRAPH_MIN_FREE_MB;
  const rawMinFreeMb = Number(argValue(args, "min-free-mb", envMinFreeMb || String(fallbackMb)));
  return {
    enabled: !hasFlag(args, "skip-storage-preflight"),
    targetDir: path.resolve(argValue(args, "storage-dir", defaults.targetDir || process.cwd())),
    minFreeMb: Number.isFinite(rawMinFreeMb) && rawMinFreeMb >= 0 ? rawMinFreeMb : fallbackMb,
    label: defaults.label || "MenuGraph enrichment",
  };
}

if (require.main === module) {
  try {
    const result = assertStoragePreflight(optionsFromArgs());
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_MIN_FREE_MB,
  assertStoragePreflight,
  availableBytesForPath,
  bytesFromMb,
  formatBytes,
  lowStorageMessage,
  optionsFromArgs,
  storagePreflight,
};
