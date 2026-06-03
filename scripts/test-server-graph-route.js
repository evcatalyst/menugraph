const assert = require("assert");
const { getGraphOverlay } = require("../server");

getGraphOverlay()
  .then((graph) => {
    assert(graph.manifest?.summary?.sourceCapabilities?.sources >= 14, "graph manifest should include evaluated sources");
    assert(Array.isArray(graph.sourceCapabilities?.nodes), "source capability nodes should load");
    assert(graph.sourceCapabilities.nodes.some((node) => node.id === "source:nypl_wotm"), "NYPL source node should load");
    assert(graph.sourceCapabilities.nodes.some((node) => node.id === "source:the_sifter"), "recipe/history source node should load");
    assert(graph.menuOverlays?.records && Object.keys(graph.menuOverlays.records).length > 0, "menu overlays should load");
    assert(graph.evidenceIndex?.sourceProbes?.northwestern_transport_menus, "external source probes should load");
    if (graph.manifest?.summary?.externalMenus?.records) {
      assert(graph.evidenceIndex?.externalMenus && Object.keys(graph.evidenceIndex.externalMenus).some((id) => id.startsWith("northwestern:")), "external menu records should load");
    }
    console.log("server graph route tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
