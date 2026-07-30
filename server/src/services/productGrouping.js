import {
  normalizeComparisonText,
  normalizeProduct,
} from "./productCanonicalization.js";

const STOP_WORDS = new Set([
  "de",
  "del",
  "el",
  "la",
  "las",
  "los",
  "en",
  "con",
  "para",
  "por",
  "un",
  "una",
  "y",
  "the",
]);

const VARIANT_TERMS = new Map([
  ["waterproof", /\b(waterproof|resistente al agua)\b/],
  ["washable", /\b(washable|lavable)\b/],
  ["black", /\bblack\b/],
  ["brown", /\bbrown\b/],
  ["refill", /\b(refill|repuesto|recarga)\b/],
  ["mini", /\b(mini|travel size)\b/],
]);

const SET_PATTERN = /\b(kit|set|combo)\b/;
const PACK_PATTERN = /\b(pack|multipack|duo)\b/;

const KNOWN_URL_BRANDS = [
  "anastasia",
  "garnier",
  "kerastase",
  "loreal",
  "maybelline",
];

export function normalizeProductText(value = "") {
  return normalizeComparisonText(value);
}

// Compatibilidad: productKey y la selección del representante conservan
// exactamente la normalización utilizada hasta v1.3.
function normalizeLegacyIdentityText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .replace(/([0-9])([a-z])/g, "$1 $2")
    .replace(/([a-z])([0-9])/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function extractSizes(text) {
  return [
    ...text.matchAll(
      /\b(\d+(?:[.,]\d+)?)\s*(ml|g|gr|kg|l|un|unidad|unidades)\b/g,
    ),
  ].map((match) => {
    const unit = match[2].startsWith("un")
      ? "un"
      : match[2] === "gr"
        ? "g"
        : match[2];
    return `${Number(match[1].replace(",", "."))}${unit}`;
  });
}

function extractPackCount(text) {
  if (/\bduo\b/.test(text)) return 2;

  const patterns = [
    /\b(?:pack|multipack)\s*(?:de\s*)?(?:x\s*)?(\d+)\b/,
    /\bx(\d+)\b/,
    /\bx\s+(\d+)\s*(?:un|unidad|unidades)\b/,
    /\b(\d+)\s*(?:un|unidad|unidades)\b/,
  ];

  for (const pattern of patterns) {
    const count = Number(text.match(pattern)?.[1]);
    if (Number.isInteger(count) && count > 1) return count;
  }

  return null;
}

function describePresentation(name) {
  if (SET_PATTERN.test(name)) return { type: "set", count: null };

  const count = extractPackCount(name);
  if (PACK_PATTERN.test(name) || count) return { type: "pack", count };

  return { type: "single", count: null };
}

function describe(product) {
  const brand = normalizeProductText(product.brand);
  const name = product.normalizedName || normalizeProductText(product.name);
  const normalizedUrl = normalizeProductText(product.productUrl);
  const comparisonText = `${name} ${normalizedUrl}`;
  const compactBrand = brand.replaceAll(" ", "");
  const urlBrandConflict = KNOWN_URL_BRANDS.some(
    (knownBrand) =>
      normalizedUrl.includes(knownBrand) && !compactBrand.includes(knownBrand),
  );
  const sizes = extractSizes(name);
  const presentation = describePresentation(name);
  const variants = [...VARIANT_TERMS]
    .filter(([, pattern]) => pattern.test(comparisonText))
    .map(([key]) => key);
  const ignored = new Set([...STOP_WORDS, ...brand.split(" "), ...variants]);
  const tokens = new Set(
    name
      .replace(/\b\d+(?:[.,]\d+)?\s*(ml|g|gr|kg|l|un|unidad|unidades)\b/g, " ")
      .split(" ")
      .filter((token) => token.length > 1 && !ignored.has(token)),
  );

  return {
    brand,
    name,
    sizes,
    variants,
    tokens,
    urlBrandConflict,
    presentation,
  };
}

function sameSet(left, right) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function hashIdentity(value) {
  let hash = 2166136261;

  for (const character of value) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

export function createProductKey(product) {
  const identity = normalizeLegacyIdentityText(
    `${product.originalBrand ?? product.brand} ${product.originalName ?? product.name}`,
  );
  return `product-${hashIdentity(identity)}`;
}

function equivalent(leftProduct, rightProduct) {
  if (leftProduct.store === rightProduct.store) return false;

  const left = describe(leftProduct);
  const right = describe(rightProduct);
  if (!left.brand || left.brand !== right.brand) return false;
  if (left.urlBrandConflict || right.urlBrandConflict) return false;
  if (left.presentation.type !== right.presentation.type) return false;
  if (left.presentation.count !== right.presentation.count) return false;
  if (!sameSet(left.variants, right.variants)) return false;
  if (left.sizes.length && right.sizes.length && !sameSet(left.sizes, right.sizes)) {
    return false;
  }

  const intersection = [...left.tokens].filter((token) => right.tokens.has(token));
  const union = new Set([...left.tokens, ...right.tokens]);
  const similarity = union.size ? intersection.length / union.size : 0;
  const contained =
    intersection.length >= 2 &&
    (intersection.length === left.tokens.size ||
      intersection.length === right.tokens.size);

  return left.name === right.name || (intersection.length >= 2 && similarity >= 0.7) || contained;
}

function buildGroup(offers, index) {
  const available = offers
    .filter((offer) => offer.inStock)
    .sort((a, b) => a.currentPrice - b.currentPrice);
  const representative = [...offers].sort((left, right) => {
    const leftIdentity = normalizeLegacyIdentityText(
      `${left.originalBrand ?? left.brand} ${left.originalName ?? left.name}`,
    );
    const rightIdentity = normalizeLegacyIdentityText(
      `${right.originalBrand ?? right.brand} ${right.originalName ?? right.name}`,
    );
    return leftIdentity.localeCompare(rightIdentity, "es") || left.id.localeCompare(right.id);
  })[0];
  const best = available[0] ?? null;
  const nextBest = available[1] ?? null;
  const offersWithHistoryIdentity = offers.map((offer) => ({
    ...offer,
    historyProductKey: createProductKey(offer),
  }));

  return {
    id: `comparison-${index}-${representative.id}`,
    productKey: createProductKey(representative),
    brand: representative.brand,
    name: representative.displayName ?? representative.name,
    displayName: representative.displayName ?? representative.name,
    normalizedName: representative.normalizedName,
    originalName: representative.originalName ?? representative.name,
    imageUrl: representative.imageUrl,
    offers: offersWithHistoryIdentity.sort((a, b) => {
      if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
      return a.currentPrice - b.currentPrice;
    }),
    bestPriceOfferId: best?.id ?? null,
    lowestPrice: best?.currentPrice ?? null,
    savings:
      best && nextBest && nextBest.currentPrice > best.currentPrice
        ? nextBest.currentPrice - best.currentPrice
        : null,
    inStock: Boolean(best),
  };
}

export function groupEquivalentProducts(products) {
  const pendingGroups = [];

  for (const rawProduct of products) {
    const product = normalizeProduct(rawProduct);
    const match = pendingGroups.find(
      (offers) =>
        !offers.some((offer) => offer.store === product.store) &&
        offers.every((offer) => equivalent(offer, product)),
    );

    if (match) match.push(product);
    else pendingGroups.push([product]);
  }

  return pendingGroups
    .map(buildGroup)
    .sort((left, right) => {
      if (left.inStock !== right.inStock) return left.inStock ? -1 : 1;
      return (left.lowestPrice ?? Infinity) - (right.lowestPrice ?? Infinity);
    });
}
