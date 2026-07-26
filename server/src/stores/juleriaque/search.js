const STORE_NAME = "Juleriaque";
const STORE_ORIGIN = "https://www.juleriaque.com.ar";
const SEARCH_LIMIT = 20;
const DEFAULT_TIMEOUT_MS = 8000;
const USER_AGENT =
  "GirlieGirlPriceCentral/0.1 (+https://github.com/OtazuCiro/girlie-girl-price-center)";

export class JuleriaqueStoreError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = "JuleriaqueStoreError";
    this.code = code;
  }
}

function validHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function findOffer(product) {
  const candidates = [];

  for (const item of Array.isArray(product.items) ? product.items : []) {
    for (const seller of Array.isArray(item.sellers) ? item.sellers : []) {
      const offer = seller.commertialOffer;
      if (!offer || !Number.isFinite(Number(offer.Price))) continue;

      candidates.push({
        item,
        offer,
        available:
          offer.IsAvailable === true && Number(offer.AvailableQuantity) > 0,
      });
    }
  }

  if (!candidates.length) return null;

  const available = candidates
    .filter((candidate) => candidate.available && Number(candidate.offer.Price) > 0)
    .sort((a, b) => Number(a.offer.Price) - Number(b.offer.Price));

  return available[0] ?? candidates[0];
}

export function normalizeJuleriaqueProduct(product) {
  const selected = findOffer(product);
  if (!selected) return null;

  const currentPrice = Number(selected.offer.Price);
  if (!Number.isFinite(currentPrice) || currentPrice < 0) return null;

  const listPrice = Number(selected.offer.ListPrice);
  const previousPrice =
    Number.isFinite(listPrice) && listPrice > currentPrice ? listPrice : null;
  const discountPercentage = previousPrice
    ? Math.round((1 - currentPrice / previousPrice) * 100)
    : null;
  const imageCandidate = selected.item.images?.[0]?.imageUrl;
  const productUrl = product.link;

  if (!validHttpUrl(productUrl)) return null;

  return {
    id: `${product.productId}-${selected.item.itemId}`,
    name: selected.item.nameComplete || selected.item.name || product.productName,
    brand: product.brand || "Sin marca",
    currentPrice,
    previousPrice,
    discountPercentage,
    imageUrl: validHttpUrl(imageCandidate) ? imageCandidate : "",
    store: STORE_NAME,
    productUrl,
    inStock: selected.available,
  };
}

export function parseJuleriaqueResponse(payload) {
  if (!Array.isArray(payload)) {
    throw new JuleriaqueStoreError(
      "UNEXPECTED_RESPONSE",
      "La tienda devolvió un formato inesperado.",
    );
  }

  return payload
    .map(normalizeJuleriaqueProduct)
    .filter(Boolean)
    .slice(0, SEARCH_LIMIT);
}

export function createJuleriaqueStore({
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  return {
    async search(query) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const encodedQuery = encodeURIComponent(query.trim());
      const url = `${STORE_ORIGIN}/api/catalog_system/pub/products/search/${encodedQuery}?_from=0&_to=${SEARCH_LIMIT - 1}`;

      try {
        const response = await fetchImpl(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": USER_AGENT,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new JuleriaqueStoreError(
            "HTTP_ERROR",
            `La tienda respondió con HTTP ${response.status}.`,
          );
        }

        return parseJuleriaqueResponse(await response.json());
      } catch (error) {
        if (error instanceof JuleriaqueStoreError) throw error;

        if (error?.name === "AbortError") {
          throw new JuleriaqueStoreError(
            "STORE_TIMEOUT",
            "La tienda tardó demasiado en responder.",
            error,
          );
        }

        throw new JuleriaqueStoreError(
          "STORE_UNAVAILABLE",
          "No se pudo consultar la tienda.",
          error,
        );
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export const juleriaqueStore = createJuleriaqueStore();

