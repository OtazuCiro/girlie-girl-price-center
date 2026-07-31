import assert from "node:assert/strict";
import test from "node:test";

import {
  hasSufficientHistoryForNewLow,
  normalizeBeautyRadarPayload,
} from "../src/history/beautyRadar.js";
import { createPriceHistoryService } from "../src/history/priceHistory.js";

function radarEntry(name, difference, overrides = {}) {
  return {
    productKey: `product-${name}`,
    offerId: `offer-${name}`,
    brand: "Marca",
    name,
    store: "Farmacity",
    currentPrice: 10000 + difference,
    previousPrice: 10000,
    difference,
    trend: difference < 0 ? "down" : difference > 0 ? "up" : "equal",
    snapshotCount: 5,
    observedDays: 3,
    observedAt: "2026-07-31T00:00:00.000Z",
    ...overrides,
  };
}

test("orders price drops by greatest absolute descent and caps results", () => {
  const recentDrops = Array.from({ length: 12 }, (_, index) =>
    radarEntry(`Producto ${index}`, -(index + 1) * 100),
  );
  recentDrops.push(radarEntry("Subió", 500));

  const radar = normalizeBeautyRadarPayload({ recentDrops }, 10);

  assert.equal(radar.recentDrops.length, 10);
  assert.equal(radar.recentDrops[0].difference, -1200);
  assert.ok(radar.recentDrops.every(({ difference }) => difference < 0));
});

test("requires five snapshots across three days and seven days for a new low", () => {
  assert.equal(
    hasSufficientHistoryForNewLow({
      snapshotCount: 5,
      observedDays: 3,
      historySpanDays: 7,
    }),
    true,
  );
  assert.equal(
    hasSufficientHistoryForNewLow({
      snapshotCount: 4,
      observedDays: 3,
      historySpanDays: 7,
    }),
    false,
  );
  assert.equal(
    hasSufficientHistoryForNewLow({
      snapshotCount: 5,
      observedDays: 2,
      historySpanDays: 7,
    }),
    false,
  );
});

test("keeps changed favorites and their trend without changing identities", () => {
  const favorite = radarEntry("Favorito", 250, {
    productKey: "product-stable",
    offerId: "offer-stable",
  });
  const radar = normalizeBeautyRadarPayload({ favoriteChanges: [favorite] });

  assert.deepEqual(radar.favoriteChanges, [favorite]);
  assert.equal(radar.favoriteChanges[0].trend, "up");
});

test("uses one aggregated repository call for the complete radar", async () => {
  let calls = 0;
  const repository = {
    async getBeautyRadar() {
      calls += 1;
      return {
        recentDrops: [radarEntry("Bajó", -500)],
        newHistoricalLows: [radarEntry("Mínimo", -200)],
        favoriteChanges: [],
      };
    },
  };
  const service = createPriceHistoryService({ repository });
  const radar = await service.getBeautyRadar({ limit: 10 });

  assert.equal(calls, 1);
  assert.equal(radar.recentDrops.length, 1);
  assert.equal(radar.newHistoricalLows.length, 1);
});
