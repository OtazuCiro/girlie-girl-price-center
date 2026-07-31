import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createApp } from "../src/app.js";

const calls = [];
const radarEntry = {
  productKey: "product-1",
  offerId: "offer-1",
  brand: "Marca",
  name: "Producto",
  store: "Farmacity",
  currentPrice: 9000,
  previousPrice: 10000,
  difference: -1000,
  trend: "down",
  snapshotCount: 5,
  observedDays: 3,
  observedAt: "2026-07-31T00:00:00.000Z",
};
const historyService = {
  enabled: true,
  async getBeautyRadar(options) {
    calls.push(options);
    return {
      recentDrops: [radarEntry],
      newHistoricalLows: [radarEntry],
      favoriteChanges: [radarEntry],
    };
  },
};
const app = createApp({ historyService });
let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("GET /api/beauty-radar returns only aggregated sections", async () => {
  const response = await fetch(
    `${baseUrl}/api/beauty-radar?favoriteOfferIds=offer-1,offer-1&favoriteProductKeys=product-1`,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.recentDrops, [radarEntry]);
  assert.deepEqual(body.newHistoricalLows, [radarEntry]);
  assert.deepEqual(body.favoriteChanges, [radarEntry]);
  assert.deepEqual(calls.at(-1), {
    favoriteOfferIds: ["offer-1"],
    favoriteProductKeys: ["product-1"],
    limit: 10,
  });
  assert.equal(Object.hasOwn(body, "snapshots"), false);
});

test("returns useful empty sections when history is unavailable", async () => {
  const unavailable = createApp({ historyService: { enabled: false } });
  const listener = await new Promise((resolve) => {
    const instance = unavailable.listen(0, "127.0.0.1", () =>
      resolve(instance),
    );
  });
  const response = await fetch(
    `http://127.0.0.1:${listener.address().port}/api/beauty-radar`,
  );
  const body = await response.json();
  await new Promise((resolve) => listener.close(resolve));

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    recentDrops: [],
    newHistoricalLows: [],
    favoriteChanges: [],
  });
});

test("never exposes repository failures", async () => {
  const failing = createApp({
    historyService: {
      enabled: true,
      async getBeautyRadar() {
        throw new Error("postgres://secret@host/database");
      },
    },
  });
  const listener = await new Promise((resolve) => {
    const instance = failing.listen(0, "127.0.0.1", () => resolve(instance));
  });
  const response = await fetch(
    `http://127.0.0.1:${listener.address().port}/api/beauty-radar`,
  );
  const body = await response.json();
  await new Promise((resolve) => listener.close(resolve));

  assert.equal(response.status, 200);
  assert.equal(JSON.stringify(body).includes("postgres"), false);
  assert.equal(JSON.stringify(body).includes("secret"), false);
});
