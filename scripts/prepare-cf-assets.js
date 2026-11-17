#!/usr/bin/env node
// Hardlink docs/ into .cf-assets, leaving the three large snapshots out of the
// Worker asset upload. They are served from the MENU_DATA R2 binding.
// --with-fixtures writes tiny stand-ins so local wrangler dev can answer
// /data/*.json before the bucket exists. It does not create a remote bucket.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "docs");
const dest = path.join(root, ".cf-assets");
const omit = new Set(["data/menus.json", "data/prices.json", "data/matches.json"]);
const withFixtures = process.argv.includes("--with-fixtures");

function relPosix(rel) {
  return rel.split(path.sep).join("/");
}

function walk(rel) {
  const abs = path.join(src, rel);
  const stat = fs.statSync(abs);
  if (stat.isDirectory()) {
    fs.mkdirSync(path.join(dest, rel), { recursive: true });
    for (const name of fs.readdirSync(abs)) walk(path.join(rel, name));
    return;
  }
  if (omit.has(relPosix(rel))) return;
  const target = path.join(dest, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  try {
    fs.linkSync(abs, target);
  } catch (error) {
    if (error.code !== "EEXIST") fs.copyFileSync(abs, target);
  }
}

fs.rmSync(dest, { recursive: true, force: true });
walk("");

if (withFixtures) {
  const fixtures = {
    "menus.json": { menus: [], summary: { total: 0 } },
    "prices.json": { records: [] },
    "matches.json": { matches: [] },
  };
  fs.mkdirSync(path.join(dest, "data"), { recursive: true });
  for (const [name, payload] of Object.entries(fixtures)) {
    fs.writeFileSync(path.join(dest, "data", name), JSON.stringify(payload));
  }
}

const bytes = walkSize(dest);
console.log(`cf assets ${withFixtures ? "with fixtures" : "without large snapshots"}: ${bytes} bytes`);

function walkSize(dir) {
  let total = 0;
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const stat = fs.statSync(abs);
    total += stat.isDirectory() ? walkSize(abs) : stat.size;
  }
  return total;
}
