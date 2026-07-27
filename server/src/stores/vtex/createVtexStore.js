const SEARCH_LIMIT = 20;
const DEFAULT_TIMEOUT_MS = 8000;
const USER_AGENT =
  "GirlieGirlPriceCentral/0.1 (+https://github.com/OtazuCiro/girlie-girl-price-center)";

export class StoreSearchError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = "StoreSearchError";
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

  return (
    candidates
      .filter(
        (candidate) =>
          candidate.available && Number(candidate.offer.Price) > 0,
      )
      .sort((a, b) => Number(a.offer.Price) - Number(b.offer.Price))[0] ??
    candidates[0]
  );
}

export function normalizeVtexProduct(product, storeName) {
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

  if (!validHttpUrl(product.link)) return null;

  return {
    id: `${storeName.toLocaleLowerCase("es")}-${product.productId}-${selected.item.itemId}`,
    name:
      selected.item.nameComplete ||
      selected.item.name ||
      product.productName,
    brand: product.brand || "Sin marca",
    currentPrice,
    previousPrice,
    discountPercentage,
    imageUrl: validHttpUrl(imageCandidate) ? imageCandidate : "",
    store: storeName,
    productUrl: product.link,
    inStock: selected.available,
  };
}

export function parseVtexResponse(payload, storeName) {
  if (!Array.isArray(payload)) {
    throw new StoreSearchError(
      "UNEXPECTED_RESPONSE",
      `${storeName} devolvió un formato inesperado.`,
    );
  }

  return payload
    .map((product) => normalizeVtexProduct(product, storeName))
    .filter(Boolean)
    .slice(0, SEARCH_LIMIT);
}

export function createVtexStore({
  name,
  origin,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  return {
    name,

    async search(query) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const encodedQuery = encodeURIComponent(query.trim());
      const url = `${origin}/api/catalog_system/pub/products/search/${encodedQuery}?_from=0&_to=${SEARCH_LIMIT - 1}`;

      try {
        const response = await fetchImpl(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": USER_AGENT,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new StoreSearchError(
            "HTTP_ERROR",
            `${name} respondió con HTTP ${response.status}.`,
          );
        }

        return parseVtexResponse(await response.json(), name);
      } catch (error) {
        if (error instanceof StoreSearchError) throw error;

        if (error?.name === "AbortError") {
          throw new StoreSearchError(
            "STORE_TIMEOUT",
            `${name} tardó demasiado en responder.`,
            error,
          );
        }

        throw new StoreSearchError(
          "STORE_UNAVAILABLE",
          `No se pudo consultar ${name}.`,
          error,
        );
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
