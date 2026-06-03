const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT_DIR = path.join(__dirname, "..");
const CACHE_DIR = path.join(ROOT_DIR, ".cache", "enrichment");

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
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
    args: process.argv.slice(2),
  };
  fs.writeFileSync(currentPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(payload, null, 2));
}

main();
