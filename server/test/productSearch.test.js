import assert from "node:assert/strict";
import test from "node:test";

import {
  SearchServiceError,
  createProductSearchService,
} from "../src/services/productSearch.js";

function store(name, search) {
  return { name, search };
}

test("queries stores concurrently and combines their products", async () => {
  const started = [];
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const stores = ["Juleriaque", "Farmacity", "Pigmento"].map((name) =>
    store(name, async () => {
      started.push(name);
      await gate;
      return [{ id: name, name, brand: name, store: name, inStock: true, currentPrice: 1 }];
    }),
  );
  const searchPromise = createProductSearchService({ stores }).search("labial");

  await Promise.resolve();
  assert.deepEqual(started, ["Juleriaque", "Farmacity", "Pigmento"]);
  release();
  const response = await searchPromise;
  assert.equal(response.results.length, 3);
  assert.ok(response.sources.every((source) => source.status === "ok"));
});

test("returns partial results and source status when one store fails", async () => {
  const service = createProductSearchService({
    stores: [
      store("Disponible", async () => []),
      store("Caída", async () => {
        throw new Error("offline");
      }),
    ],
  });

  const response = await service.search("shampoo");
  assert.deepEqual(response.results, []);
  assert.deepEqual(
    response.sources.map(({ store: name, status }) => ({ name, status })),
    [
      { name: "Disponible", status: "ok" },
      { name: "Caída", status: "error" },
    ],
  );
});

test("caches normalized searches independently per store", async () => {
  let calls = 0;
  let timestamp = 1000;
  const service = createProductSearchService({
    stores: [
      store("Tienda", async () => {
        calls += 1;
        return [];
      }),
    ],
    ttlMs: 100,
    now: () => timestamp,
  });

  await service.search("  Ácido   Hialurónico ");
  timestamp += 50;
  const cached = await service.search("acido hialuronico");
  assert.equal(calls, 1);
  assert.equal(cached.sources[0].cached, true);

  timestamp += 100;
  await service.search("acido hialuronico");
  assert.equal(calls, 2);
});

test("returns a controlled error only when every store fails", async () => {
  const service = createProductSearchService({
    stores: [
      store("A", async () => {
        throw new Error("offline");
      }),
      store("B", async () => {
        throw new Error("offline");
      }),
    ],
  });

  await assert.rejects(
    service.search("kerastase"),
    (error) =>
      error instanceof SearchServiceError &&
      error.code === "STORES_UNAVAILABLE" &&
      error.status === 502,
  );
});
