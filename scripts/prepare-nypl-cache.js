const fs = require("fs/promises");
const { existsSync } = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const DEFAULT_NYPL_DATA_URL = "https://nypl-menus-data.s3.amazonaws.com/gzips/2023_03_16_07_02_35_data.tgz";
const CACHE_DIR = path.join(__dirname, "..", ".cache", "nypl");
const EXTRACT_DIR = path.join(CACHE_DIR, "extract");
const ARCHIVE_PATH = path.join(CACHE_DIR, "nypl-menus-data.tgz");
const REQUIRED_FILES = ["Menu.csv", "MenuPage.csv", "Dish.csv", "MenuItem.csv"];

async function hasExtractedCsvs() {
  for (const file of REQUIRED_FILES) {
    if (!existsSync(path.join(EXTRACT_DIR, file))) return false;
  }
  return true;
}

async function download(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download NYPL data ${response.status}: ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(destination, buffer);
}

async function extractArchive() {
  await fs.mkdir(EXTRACT_DIR, { recursive: true });
  const result = spawnSync("tar", ["-xzf", ARCHIVE_PATH, "-C", EXTRACT_DIR], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`tar exited with status ${result.status}`);
}

async function main() {
  if (await hasExtractedCsvs()) {
    console.log("NYPL CSV cache already available.");
    return;
  }

  await fs.mkdir(CACHE_DIR, { recursive: true });
  const url = process.env.NYPL_DATA_URL || DEFAULT_NYPL_DATA_URL;
  console.log(`Downloading NYPL menu data from ${url}`);
  await download(url, ARCHIVE_PATH);
  await extractArchive();

  if (!(await hasExtractedCsvs())) {
    throw new Error("NYPL archive did not produce the expected CSV files.");
  }
  console.log("NYPL CSV cache ready.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
