const assert = require("assert");
const { getGraphOverlay, getGraphOverlayShard } = require("../server");

Promise.all([getGraphOverlay(), getGraphOverlayShard("cia"), getGraphOverlayShard("nypl")])
  .then(([graph, ciaShard, nyplShard]) => {
    assert(graph.manifest?.summary?.sourceCapabilities?.sources >= 15, "graph manifest should include evaluated sources");
    assert(Array.isArray(graph.sourceCapabilities?.nodes), "source capability nodes should load");
    assert(graph.sourceCapabilities.nodes.some((node) => node.id === "source:nypl_wotm"), "NYPL source node should load");
    assert(graph.sourceCapabilities.nodes.some((node) => node.id === "source:the_sifter"), "recipe/history source node should load");
    assert(graph.menuOverlays?.sharded === true, "menu overlays should be sharded");
    assert((graph.menuOverlays?.shards || []).some((shard) => shard.sourceKey === "cia"), "CIA overlay shard should be listed");
    assert(ciaShard?.records && Object.keys(ciaShard.records).length > 0, "CIA overlay shard should load");
    assert(nyplShard?.records && Object.keys(nyplShard.records).length > 0, "NYPL overlay shard should load");
    const nyplManifestShard = (graph.menuOverlays?.shards || []).find((shard) => shard.sourceKey === "nypl");
    if (nyplManifestShard?.subsharded) {
      assert.strictEqual(Object.keys(nyplShard.records).length, nyplManifestShard.records, "NYPL subshards should hydrate to the manifest record count");
    }
    assert(graph.evidenceIndex?.sourceProbes?.northwestern_transport_menus, "external source probes should load");
    if (graph.manifest?.summary?.externalMenus?.records) {
      assert(graph.evidenceIndex?.externalMenus && Object.keys(graph.evidenceIndex.externalMenus).some((id) => id.startsWith("northwestern:")), "external menu records should load");
      assert(graph.evidenceIndex?.externalMenus && Object.keys(graph.evidenceIndex.externalMenus).some((id) => id.startsWith("milwaukee:")), "Milwaukee external menu records should load");
    }
    console.log("server graph route tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
