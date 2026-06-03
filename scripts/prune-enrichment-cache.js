const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "..");
const DEFAULT_CACHE_DIR = path.join(ROOT_DIR, ".cache", "enrichment");

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
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function isInsideDirectory(baseDir, candidatePath) {
  const base = path.resolve(baseDir);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(base, candidate);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function fileStats(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile() ? stat : null;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function walkFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

function directorySize(dirPath) {
  return walkFiles(dirPath).reduce((total, filePath) => {
    const stat = fileStats(filePath);
    return total + (stat ? stat.size : 0);
  }, 0);
}

function candidateFromFile(cacheDir, filePath, kind) {
  const stat = fileStats(filePath);
  if (!stat) return null;
  if (!isInsideDirectory(cacheDir, filePath)) {
    throw new Error(`Refusing to prune file outside cache directory: ${filePath}`);
  }
  return {
    path: filePath,
    relativePath: path.relative(cacheDir, filePath),
    kind,
    bytes: stat.size,
    mtimeMs: stat.mtimeMs,
  };
}

function collectPruneCandidates(options = {}) {
  const cacheDir = path.resolve(options.cacheDir || DEFAULT_CACHE_DIR);
  const pruneTranscripts = options.pruneTranscripts !== false;
  const pruneLogs = options.pruneLogs !== false;
  const keepLogs = Math.max(0, Number.isFinite(options.keepLogs) ? options.keepLogs : 5);
  const candidates = [];

  if (pruneTranscripts) {
    const transcriptsDir = path.join(cacheDir, "transcripts");
    for (const filePath of walkFiles(transcriptsDir)) {
      const candidate = candidateFromFile(cacheDir, filePath, "transcript");
      if (candidate) candidates.push(candidate);
    }
  }

  if (pruneLogs && fs.existsSync(cacheDir)) {
    const logFiles = fs
      .readdirSync(cacheDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /^overnight-.+\.log$/.test(entry.name))
      .map((entry) => {
        const filePath = path.join(cacheDir, entry.name);
        const candidate = candidateFromFile(cacheDir, filePath, "overnight_log");
        return candidate;
      })
      .filter(Boolean)
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
    candidates.push(...logFiles.slice(keepLogs));
  }

  return candidates.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function summarizeCandidates(cacheDir, candidates, dryRun, bytesBefore, bytesAfter) {
  const bytesDeleted = candidates.reduce((total, candidate) => total + candidate.bytes, 0);
  const byKind = candidates.reduce((counts, candidate) => {
    counts[candidate.kind] = (counts[candidate.kind] || 0) + 1;
    return counts;
  }, {});
  return {
    dryRun,
    cacheDir,
    filesDeleted: dryRun ? 0 : candidates.length,
    filesMatched: candidates.length,
    bytesDeleted: dryRun ? 0 : bytesDeleted,
    bytesMatched: bytesDeleted,
    formattedBytesDeleted: formatBytes(dryRun ? 0 : bytesDeleted),
    formattedBytesMatched: formatBytes(bytesDeleted),
    transcriptsMatched: byKind.transcript || 0,
    logsMatched: byKind.overnight_log || 0,
    transcriptsDeleted: dryRun ? 0 : byKind.transcript || 0,
    logsDeleted: dryRun ? 0 : byKind.overnight_log || 0,
    bytesBefore,
    bytesAfter,
    formattedBytesBefore: formatBytes(bytesBefore),
    formattedBytesAfter: formatBytes(bytesAfter),
  };
}

function pruneCache(options = {}) {
  const cacheDir = path.resolve(options.cacheDir || DEFAULT_CACHE_DIR);
  const dryRun = Boolean(options.dryRun);
  const bytesBefore = directorySize(cacheDir);
  const candidates = collectPruneCandidates({ ...options, cacheDir });

  if (!dryRun) {
    for (const candidate of candidates) {
      if (!isInsideDirectory(cacheDir, candidate.path)) {
        throw new Error(`Refusing to prune file outside cache directory: ${candidate.path}`);
      }
      fs.unlinkSync(candidate.path);
    }
  }

  const bytesAfter = dryRun ? bytesBefore : directorySize(cacheDir);
  return summarizeCandidates(cacheDir, candidates, dryRun, bytesBefore, bytesAfter);
}

function optionsFromArgs(args = process.argv.slice(2)) {
  return {
    cacheDir: path.resolve(argValue(args, "cache-dir", DEFAULT_CACHE_DIR)),
    dryRun: hasFlag(args, "dry-run"),
    pruneTranscripts: !hasFlag(args, "no-transcripts"),
    pruneLogs: !hasFlag(args, "no-logs"),
    keepLogs: Math.max(0, Number(argValue(args, "keep-logs", "5")) || 0),
  };
}

function main() {
  const summary = pruneCache(optionsFromArgs());
  console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

module.exports = {
  collectPruneCandidates,
  directorySize,
  formatBytes,
  isInsideDirectory,
  optionsFromArgs,
  pruneCache,
};
