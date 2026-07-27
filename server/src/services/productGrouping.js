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

function classifyProduct(name) {
  if (SET_PATTERN.test(name)) return { productType: "set", packCount: null };

  const packCount = extractPackCount(name);
  if (PACK_PATTERN.test(name) || packCount) {
    return { productType: "pack", packCount };
  }

  return { productType: "single", packCount: null };
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
  const { productType, packCount } = classifyProduct(name);
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
    productType,
    packCount,
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
  const identity = normalizeProductText(`${product.brand} ${product.name}`);
  return `product-${hashIdentity(identity)}`;
}

function familyTokens(product) {
  const description = describe(product);
  const ignored = new Set([
    ...STOP_WORDS,
    ...description.brand.split(" "),
    ...description.variants,
    "pack",
    "multipack",
    "duo",
    "kit",
    "set",
    "combo",
    "unidad",
    "unidades",
  ]);

  return new Set(
    description.name
      .replace(/\b\d+(?:[.,]\d+)?\s*(ml|g|gr|kg|l|un|unidad|unidades)\b/g, " ")
      .replace(/\bx\s*\d+\b/g, " ")
      .split(" ")
      .filter((token) => token.length > 1 && !ignored.has(token)),
  );
}

export function createProductFamilyKey(product) {
  const brand = normalizeProductText(product.brand);
  const signature = [...familyTokens(product)].sort().join(" ");
  return `family-${hashIdentity(`${brand} ${signature}`)}`;
}

function equivalent(leftProduct, rightProduct) {
  if (leftProduct.store === rightProduct.store) return false;

  const left = describe(leftProduct);
  const right = describe(rightProduct);
  if (!left.brand || left.brand !== right.brand) return false;
  if (left.urlBrandConflict || right.urlBrandConflict) return false;
  if (left.productType !== right.productType) return false;
  if (left.packCount !== right.packCount) return false;
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
    const leftIdentity = normalizeProductText(`${left.brand} ${left.name}`);
    const rightIdentity = normalizeProductText(`${right.brand} ${right.name}`);
    return leftIdentity.localeCompare(rightIdentity, "es") || left.id.localeCompare(right.id);
  })[0];
  const best = available[0] ?? null;
  const nextBest = available[1] ?? null;
  const { productType, packCount } = describe(representative);

  return {
    id: `comparison-${index}-${representative.id}`,
    productKey: createProductKey(representative),
    productFamilyKey: createProductFamilyKey(representative),
    productType,
    packCount,
    unitPrice:
      productType === "pack" && packCount && best
        ? best.currentPrice / packCount
        : null,
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

function familiesAreRelated(left, right) {
  const leftDescription = describe(left);
  const rightDescription = describe(right);
  if (!leftDescription.brand || leftDescription.brand !== rightDescription.brand) {
    return false;
  }
  if (leftDescription.urlBrandConflict || rightDescription.urlBrandConflict) {
    return false;
  }

  const leftTokens = familyTokens(left);
  const rightTokens = familyTokens(right);
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token));
  return (
    leftTokens.size > 0 &&
    rightTokens.size > 0 &&
    (sameSet([...leftTokens].sort(), [...rightTokens].sort()) ||
      (intersection.length >= 2 &&
        (intersection.length === leftTokens.size ||
          intersection.length === rightTokens.size)))
  );
}

function representativeOffer(group) {
  return group.offers[0];
}

function itemSize(group) {
  const sizes = extractSizes(normalizeProductText(group.name)).filter(
    (size) => !size.endsWith("un"),
  );
  return sizes.length === 1 ? sizes[0] : null;
}

function choosePrimary(groups) {
  const singles = groups.filter((group) => group.productType === "single");
  return [...(singles.length ? singles : groups)].sort(
    (left, right) =>
      right.offers.length - left.offers.length ||
      left.name.localeCompare(right.name, "es") ||
      left.productKey.localeCompare(right.productKey),
  )[0];
}

export function buildCatalogFamilies(groups) {
  const pending = [];
  const ordered = [...groups].sort(
    (left, right) =>
      (left.productType === "single" ? 0 : 1) -
        (right.productType === "single" ? 0 : 1) ||
      left.productKey.localeCompare(right.productKey),
  );

  for (const group of ordered) {
    const offer = representativeOffer(group);
    const family = pending.find((members) =>
      members.some((member) =>
        familiesAreRelated(representativeOffer(member), offer),
      ),
    );
    if (family) family.push(group);
    else pending.push([group]);
  }

  return pending
    .map((members) => {
      const primary = choosePrimary(members);
      const productFamilyKey = createProductFamilyKey(
        representativeOffer(primary),
      );
      const normalized = members.map((group) => ({
        ...group,
        productFamilyKey,
      }));
      const normalizedPrimary = normalized.find(
        (group) => group.productKey === primary.productKey,
      );
      const variants = normalized.filter(
        (group) =>
          group.productType === "single" &&
          group.productKey !== normalizedPrimary.productKey,
      );
      const packs = normalized.filter(
        (group) => group.productType === "pack",
      );
      const sets = normalized.filter((group) => group.productType === "set");
      const valueCandidates = [normalizedPrimary, ...variants, ...packs].filter(
        (group) =>
          group.inStock &&
          itemSize(group) &&
          (group.productType !== "pack" || Number.isFinite(group.unitPrice)),
      );
      const sizes = new Set(valueCandidates.map(itemSize));
      const comparable =
        valueCandidates.length >= 2 && sizes.size === 1
          ? valueCandidates
          : [];
      const bestValue = comparable.sort((left, right) => {
        const leftUnit =
          left.productType === "pack"
            ? left.unitPrice
            : left.lowestPrice;
        const rightUnit =
          right.productType === "pack"
            ? right.unitPrice
            : right.lowestPrice;
        return leftUnit - rightUnit;
      })[0];

      return {
        id: productFamilyKey,
        productFamilyKey,
        brand: normalizedPrimary.brand,
        name: normalizedPrimary.name,
        primary: normalizedPrimary,
        variants,
        packs,
        sets,
        bestValueProductKey: bestValue?.productKey ?? null,
      };
    })
    .sort((left, right) => {
      if (left.primary.inStock !== right.primary.inStock) {
        return left.primary.inStock ? -1 : 1;
      }
      return (
        (left.primary.lowestPrice ?? Infinity) -
        (right.primary.lowestPrice ?? Infinity)
      );
    });
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
