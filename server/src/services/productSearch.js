import {
  JuleriaqueStoreError,
  juleriaqueStore,
} from "../stores/juleriaque/search.js";

const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;

export class SearchServiceError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = "SearchServiceError";
    this.code = code;
    this.status = status;
  }
}

function normalizeCacheKey(query) {
  return query.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

export function createProductSearchService({
  store = juleriaqueStore,
  ttlMs = DEFAULT_CACHE_TTL_MS,
  now = Date.now,
} = {}) {
  const cache = new Map();

  return {
    async search(query) {
      const key = normalizeCacheKey(query);
      const cached = cache.get(key);

      if (cached && now() - cached.createdAt < ttlMs) {
        return cached.results;
      }

      try {
        const results = await store.search(query);
        cache.set(key, { createdAt: now(), results });
        return results;
      } catch (error) {
        if (error instanceof JuleriaqueStoreError && error.code === "STORE_TIMEOUT") {
          throw new SearchServiceError(
            "STORE_TIMEOUT",
            "La tienda tardó demasiado en responder.",
            504,
          );
        }

        throw new SearchServiceError(
          "STORE_UNAVAILABLE",
          "No pudimos consultar la tienda en este momento.",
          502,
        );
      }
    },

    clearCache() {
      cache.clear();
    },
  };
}

export const defaultSearchService = createProductSearchService();

