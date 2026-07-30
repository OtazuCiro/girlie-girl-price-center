import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePriceSummary,
  createPriceHistoryService,
  createPriceSnapshot,
  sameSnapshotState,
} from "../src/history/priceHistory.js";

function offer(overrides = {}) {
  return {
    id: "offer-1",
    store: "Farmacity",
    currentPrice: 20000,
    previousPrice: 22000,
    discountPercentage: 9,
    productUrl: "https://example.com/product",
    inStock: true,
    ...overrides,
  };
}

function group(overrides = {}) {
  return {
    productKey: "product-1",
    brand: "Marca",
    name: "Producto 100 ml",
    offers: [offer()],
    ...overrides,
  };
}

function createMemoryRepository() {
  const snapshots = [];

  return {
    snapshots,
    async recordSnapshot({ snapshot }) {
      const previous = snapshots.findLast(
        (candidate) =>
          candidate.productKey === snapshot.productKey &&
          candidate.store === snapshot.store,
      );
      if (previous && sameSnapshotState(previous, snapshot)) return false;
      snapshots.push(snapshot);
      return true;
    },
    async listSnapshots(productKey, store, limit) {
      return snapshots
        .filter(
          (snapshot) =>
            snapshot.productKey === productKey && snapshot.store === store,
        )
        .toReversed()
        .slice(0, limit);
    },
  };
}

test("creates the minimal normalized snapshot", () => {
  const snapshot = createPriceSnapshot({
    productKey: "product-1",
    offer: offer(),
    timestamp: Date.UTC(2026, 0, 1),
  });

  assert.deepEqual(snapshot, {
    productKey: "product-1",
    store: "Farmacity",
    offerId: "offer-1",
    productUrl: "https://example.com/product",
    timestamp: "2026-01-01T00:00:00.000Z",
    currentPrice: 20000,
    previousPrice: 22000,
    discountPercentage: 9,
    inStock: true,
  });
});

test("does not record identical consecutive snapshots", async () => {
  const repository = createMemoryRepository();
  let timestamp = Date.UTC(2026, 0, 1);
  const service = createPriceHistoryService({
    repository,
    now: () => timestamp,
  });

  assert.deepEqual(await service.recordGroups([group()]), { inserted: 1 });
  timestamp += 1000;
  assert.deepEqual(await service.recordGroups([group()]), { inserted: 0 });
  timestamp += 1000;
  assert.deepEqual(
    await service.recordGroups([
      group({ offers: [offer({ currentPrice: 19000 })] }),
    ]),
    { inserted: 1 },
  );
  assert.equal(repository.snapshots.length, 2);
});

test("calculates trend, minimum, maximum and average", () => {
  const summary = calculatePriceSummary([
    { timestamp: "2026-01-01T00:00:00.000Z", currentPrice: 22000, inStock: true },
    { timestamp: "2026-01-02T00:00:00.000Z", currentPrice: 20000, inStock: true },
    { timestamp: "2026-01-03T00:00:00.000Z", currentPrice: 18000, inStock: true },
  ]);

  assert.equal(summary.trend, "down");
  assert.equal(summary.change, -2000);
  assert.equal(summary.minimum, 18000);
  assert.equal(summary.maximum, 22000);
  assert.equal(summary.average, 20000);
});

test("marks a statistically clear good price only with sufficient history", () => {
  const summary = calculatePriceSummary([
    { timestamp: "2026-01-01T00:00:00.000Z", currentPrice: 20000, inStock: true },
    { timestamp: "2026-01-03T00:00:00.000Z", currentPrice: 20500, inStock: true },
    { timestamp: "2026-01-05T00:00:00.000Z", currentPrice: 19800, inStock: true },
    { timestamp: "2026-01-07T00:00:00.000Z", currentPrice: 20200, inStock: true },
    { timestamp: "2026-01-10T00:00:00.000Z", currentPrice: 15000, inStock: true },
  ]);

  assert.equal(summary.goodPrice, true);
});

test("keeps history calculations isolated by product and store", async () => {
  const repository = createMemoryRepository();
  const service = createPriceHistoryService({
    repository,
    now: () => Date.UTC(2026, 0, 1),
  });
  await service.recordGroups([group()]);
  await repository.recordSnapshot({
    snapshot: {
      ...createPriceSnapshot({
        productKey: "product-1",
        offer: offer({ store: "Pigmento", currentPrice: 10000 }),
        timestamp: Date.UTC(2026, 0, 2),
      }),
    },
  });

  const history = await service.getHistory("product-1", "Farmacity", 20);
  assert.equal(history.snapshots.length, 1);
  assert.equal(history.summary.latestPrice, 20000);
});
