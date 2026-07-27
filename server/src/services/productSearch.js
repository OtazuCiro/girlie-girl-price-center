import { farmacityStore } from "../stores/farmacity/search.js";
import { juleriaqueStore } from "../stores/juleriaque/search.js";
import { pigmentoStore } from "../stores/pigmento/search.js";
import { groupEquivalentProducts, normalizeProductText } from "./productGrouping.js";

const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;

export class SearchServiceError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = "SearchServiceError";
    this.code = code;
    this.status = status;
  }
}

export function normalizeSearchQuery(query) {
  return normalizeProductText(query);
}

export function createProductSearchService({
  stores = [juleriaqueStore, farmacityStore, pigmentoStore],
  ttlMs = DEFAULT_CACHE_TTL_MS,
  now = Date.now,
} = {}) {
  const cache = new Map();

  async function searchStore(store, query, key) {
    const cacheKey = `${store.name}:${key}`;
    const cached = cache.get(cacheKey);

    if (cached && now() - cached.createdAt < ttlMs) {
      return { results: cached.results, cached: true };
    }

    const results = await store.search(query);
    cache.set(cacheKey, { createdAt: now(), results });
    return { results, cached: false };
  }

  return {
    async search(query) {
      const cleanQuery = query.trim().replace(/\s+/g, " ");
      const key = normalizeSearchQuery(cleanQuery);
      const settled = await Promise.allSettled(
        stores.map((store) => searchStore(store, cleanQuery, key)),
      );
      const sources = settled.map((result, index) => ({
        store: stores[index].name,
        status: result.status === "fulfilled" ? "ok" : "error",
        cached: result.status === "fulfilled" ? result.value.cached : false,
        count: result.status === "fulfilled" ? result.value.results.length : 0,
      }));
      const results = settled.flatMap((result) =>
        result.status === "fulfilled" ? result.value.results : [],
      );

      if (settled.every((result) => result.status === "rejected")) {
        const timedOut = settled.every(
          (result) => result.reason?.code === "STORE_TIMEOUT",
        );
        throw new SearchServiceError(
          timedOut ? "STORE_TIMEOUT" : "STORES_UNAVAILABLE",
          timedOut
            ? "Las tiendas tardaron demasiado en responder."
            : "No pudimos consultar las tiendas en este momento.",
          timedOut ? 504 : 502,
        );
      }

      return {
        results,
        groups: groupEquivalentProducts(results),
        sources,
      };
    },

    clearCache() {
      cache.clear();
    },
  };
}

export const defaultSearchService = createProductSearchService();
