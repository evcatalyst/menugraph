const fs = require("fs/promises");
const path = require("path");
const { getMenus, getOntology, ontologyStatus, startOntologyBuild } = require("../server");

const CONTENTDM_HOST = "ciadigitalcollections.culinary.edu";
const COLLECTION = "p16940coll1";
const DATA_DIR = path.join(__dirname, "..", "docs", "data");

function argValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function directImageUrl(id) {
  return `https://${CONTENTDM_HOST}/digital/api/singleitem/image/${COLLECTION}/${id}/default.jpg`;
}

function publicMenu(menu) {
  return {
    ...menu,
    itemUrl: `https://${CONTENTDM_HOST}/digital/collection/${COLLECTION}/id/${menu.id}`,
    imageUrl: directImageUrl(menu.id),
  };
}

function publicOntology(ontology) {
  const { job, recordTexts, termIndex, ...rest } = ontology;
  return rest;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buildTextOntology(limit) {
  startOntologyBuild(limit, true);
  let lastMessage = "";
  while (ontologyStatus().active) {
    const status = ontologyStatus();
    const message = `${status.phase}: ${status.indexed}/${status.total || "..."} checked, ${status.transcriptRecords} transcript records`;
    if (message !== lastMessage) {
      console.log(message);
      lastMessage = message;
    }
    await sleep(1000);
  }
  const status = ontologyStatus();
  if (status.error) throw new Error(status.error);
  return getOntology(false);
}

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  console.log("Building static menu snapshot...");
  const menusPayload = await getMenus(true);
  const publicMenusPayload = {
    ...menusPayload,
    menus: menusPayload.menus.map(publicMenu),
  };
  await fs.writeFile(path.join(DATA_DIR, "menus.json"), JSON.stringify(publicMenusPayload), "utf8");
  console.log(`Wrote ${publicMenusPayload.menus.length.toLocaleString()} menus.`);

  const textLimit = argValue("text");
  const ontology = textLimit ? await buildTextOntology(textLimit) : await getOntology(true);
  await fs.writeFile(path.join(DATA_DIR, "ontology.json"), JSON.stringify(publicOntology(ontology)), "utf8");
  console.log(`Wrote ${ontology.mode} ontology with ${Number(ontology.transcriptRecords || 0).toLocaleString()} transcript records.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
