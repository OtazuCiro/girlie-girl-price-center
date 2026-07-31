import { normalizeBeautyRadarPayload } from "./beautyRadar.js";

const MINIMUM_GOOD_PRICE_SNAPSHOTS = 5;
const MINIMUM_HISTORY_SPAN_MS = 7 * 24 * 60 * 60 * 1000;

function nullableNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

export function createPriceSnapshot({ productKey, offer, timestamp }) {
  return {
    productKey,
    store: offer.store,
    offerId: offer.id,
    productUrl: offer.productUrl,
    timestamp: new Date(timestamp).toISOString(),
    currentPrice: Number(offer.currentPrice),
    previousPrice: nullableNumber(offer.previousPrice),
    discountPercentage: nullableNumber(offer.discountPercentage),
    inStock: Boolean(offer.inStock),
  };
}

export function sameSnapshotState(left, right) {
  return (
    left.currentPrice === right.currentPrice &&
    left.previousPrice === right.previousPrice &&
    left.discountPercentage === right.discountPercentage &&
    left.inStock === right.inStock
  );
}

function round(value) {
  return Math.round(value * 100) / 100;
}

export function calculatePriceSummary(snapshots) {
  const ordered = [...snapshots].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  );
  const priced = ordered.filter(
    (snapshot) =>
      snapshot.inStock &&
      Number.isFinite(snapshot.currentPrice) &&
      snapshot.currentPrice >= 0,
  );
  const latest = ordered[0] ?? null;
  const previous = ordered[1] ?? null;

  if (!latest) {
    return {
      latestPrice: null,
      previousPrice: null,
      change: null,
      trend: null,
      minimum: null,
      maximum: null,
      average: null,
      goodPrice: false,
      snapshotCount: 0,
    };
  }

  const change =
    previous && latest.currentPrice !== null && previous.currentPrice !== null
      ? round(latest.currentPrice - previous.currentPrice)
      : null;
  const trend = change === null ? null : change < 0 ? "down" : change > 0 ? "up" : "equal";
  const prices = priced.map((snapshot) => snapshot.currentPrice);
  const average = prices.length
    ? round(prices.reduce((sum, price) => sum + price, 0) / prices.length)
    : null;
  const variance =
    prices.length > 1
      ? prices.reduce((sum, price) => sum + (price - average) ** 2, 0) /
        (prices.length - 1)
      : 0;
  const standardDeviation = Math.sqrt(variance);
  const oldestTimestamp = priced.length
    ? new Date(priced.at(-1).timestamp).getTime()
    : null;
  const newestTimestamp = priced.length
    ? new Date(priced[0].timestamp).getTime()
    : null;
  const sufficientHistory =
    prices.length >= MINIMUM_GOOD_PRICE_SNAPSHOTS &&
    newestTimestamp - oldestTimestamp >= MINIMUM_HISTORY_SPAN_MS;

  return {
    latestPrice: latest.currentPrice,
    previousPrice: previous?.currentPrice ?? null,
    change,
    trend,
    minimum: prices.length ? Math.min(...prices) : null,
    maximum: prices.length ? Math.max(...prices) : null,
    average,
    goodPrice:
      sufficientHistory &&
      standardDeviation > 0 &&
      latest.inStock &&
      latest.currentPrice < average - standardDeviation,
    snapshotCount: ordered.length,
  };
}

export function createPriceHistoryService({
  repository,
  now = Date.now,
} = {}) {
  return {
    enabled: Boolean(repository),

    async recordGroups(groups) {
      if (!repository) return { inserted: 0 };

      const timestamp = now();
      const entries = groups.flatMap((group) =>
        group.offers.map((offer) => ({
            product: {
              productKey: offer.historyProductKey ?? group.productKey,
              brand: group.brand,
              name: group.displayName ?? group.name,
            },
            snapshot: createPriceSnapshot({
              productKey: offer.historyProductKey ?? group.productKey,
              offer,
              timestamp,
            }),
          })),
      );

      if (typeof repository.recordSnapshots === "function") {
        return { inserted: await repository.recordSnapshots(entries) };
      }

      let inserted = 0;
      for (const entry of entries) {
        if (await repository.recordSnapshot(entry)) inserted += 1;
      }
      return { inserted };
    },

    async getHistory(productKey, store, limit = 20) {
      if (!repository) return null;
      const snapshots = await repository.listSnapshots(productKey, store, limit);
      return {
        productKey,
        store,
        summary: calculatePriceSummary(snapshots),
        snapshots,
      };
    },

    async getBeautyRadar(options = {}) {
      if (!repository?.getBeautyRadar) {
        return {
          recentDrops: [],
          newHistoricalLows: [],
          favoriteChanges: [],
        };
      }
      return normalizeBeautyRadarPayload(
        await repository.getBeautyRadar(options),
        options.limit,
      );
    },
  };
}
