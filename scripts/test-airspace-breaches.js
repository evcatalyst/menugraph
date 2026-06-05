const assert = require("assert");
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "docs", "data", "airspace-breaches.json");
const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));

assert.strictEqual(payload.version, 1);
assert(payload.region?.label, "region label is required");
assert(payload.sourcePolicy?.hardHitDefinition, "hard hit definition is required");
assert(payload.sourcePolicy?.softHitDefinition, "soft hit definition is required");

const parcels = new Map((payload.parcels || []).map((parcel) => [parcel.id, parcel]));
assert(parcels.size > 0, "at least one parcel is required");
for (const parcel of parcels.values()) {
  assert(parcel.id, "parcel id is required");
  assert(parcel.label, "parcel label is required");
  assert(Array.isArray(parcel.polygon) && parcel.polygon.length >= 3, `parcel ${parcel.id} needs a polygon`);
}

let hardHits = 0;
let softHits = 0;
const impacted = new Set();
const breaches = payload.breaches || [];
assert(breaches.length > 0, "at least one breach row is required");
for (const breach of breaches) {
  assert(breach.id, "breach id is required");
  assert(["known", "probable", "review"].includes(breach.status), `invalid breach status ${breach.status}`);
  assert(["hard", "soft"].includes(breach.severity), `invalid breach severity ${breach.severity}`);
  assert(!Number.isNaN(new Date(breach.observedAt).getTime()), `breach ${breach.id} needs an observedAt timestamp`);
  assert(Number.isFinite(Number(breach.flight?.speedKts)), `breach ${breach.id} needs speedKts`);
  assert(Number.isFinite(Number(breach.flight?.altitudeFt)), `breach ${breach.id} needs altitudeFt`);
  assert(Array.isArray(breach.path) && breach.path.length >= 2, `breach ${breach.id} needs a flight path`);
  for (const hit of breach.hardHits || []) {
    assert(parcels.has(hit.parcelId), `hard hit ${hit.parcelId} must reference a known parcel`);
    hardHits += 1;
    impacted.add(hit.parcelId);
  }
  for (const hit of breach.softHits || []) {
    assert(parcels.has(hit.parcelId), `soft hit ${hit.parcelId} must reference a known parcel`);
    softHits += 1;
    impacted.add(hit.parcelId);
  }
}

assert.strictEqual(payload.summary?.breaches, breaches.length);
assert.strictEqual(payload.summary?.hardHits, hardHits);
assert.strictEqual(payload.summary?.softHits, softHits);
assert.strictEqual(payload.summary?.distinctParcelsImpacted, impacted.size);

console.log("airspace breach data tests passed");
