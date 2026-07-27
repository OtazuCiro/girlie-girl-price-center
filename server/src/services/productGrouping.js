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
  ["refill", /\b(refill|repuesto|recarga)\b/],
  ["pack", /\b(pack|kit|set|combo)\b/],
  ["mini", /\b(mini|travel size)\b/],
]);

const KNOWN_URL_BRANDS = [
  "anastasia",
  "garnier",
  "kerastase",
  "loreal",
  "maybelline",
];

export function normalizeProductText(value = "") {
  return value
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
    const unit = match[2].startsWith("un") ? "un" : match[2] === "gr" ? "g" : match[2];
    return `${Number(match[1].replace(",", "."))}${unit}`;
  });
}

function describe(product) {
  const brand = normalizeProductText(product.brand);
  const name = normalizeProductText(product.name);
  const normalizedUrl = normalizeProductText(product.productUrl);
  const comparisonText = `${name} ${normalizedUrl}`;
  const compactBrand = brand.replaceAll(" ", "");
  const urlBrandConflict = KNOWN_URL_BRANDS.some(
    (knownBrand) =>
      normalizedUrl.includes(knownBrand) && !compactBrand.includes(knownBrand),
  );
  const sizes = extractSizes(name);
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

  return { brand, name, sizes, variants, tokens, urlBrandConflict };
}

function sameSet(left, right) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function equivalent(leftProduct, rightProduct) {
  if (leftProduct.store === rightProduct.store) return false;

  const left = describe(leftProduct);
  const right = describe(rightProduct);
  if (!left.brand || left.brand !== right.brand) return false;
  if (left.urlBrandConflict || right.urlBrandConflict) return false;
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
  const representative = available[0] ?? offers[0];
  const best = available[0] ?? null;
  const nextBest = available[1] ?? null;

  return {
    id: `comparison-${index}-${representative.id}`,
    brand: representative.brand,
    name: representative.name,
    imageUrl: representative.imageUrl,
    offers: [...offers].sort((a, b) => {
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

  for (const product of products) {
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
