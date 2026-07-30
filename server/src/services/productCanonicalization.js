const BRAND_ALIASES = [
  {
    canonical: "L'Oréal Paris",
    aliases: ["loreal", "loreal paris", "l oreal", "l oreal paris"],
  },
  {
    canonical: "Maybelline",
    aliases: ["maybelline", "maybelline new york"],
  },
  {
    canonical: "Kérastase",
    aliases: ["kerastase"],
  },
  {
    canonical: "Anastasia Beverly Hills",
    aliases: ["anastasia", "anastasia beverly hills"],
  },
];

const VARIANT_ALIASES = [
  { from: ["all", "nb"], to: ["all", "night", "black"] },
  { from: ["wtp"], to: ["waterproof"] },
  { from: ["wp"], to: ["waterproof"] },
];

const TOKEN_ALIASES = new Map([
  ["repuesto", "refill"],
  ["recarga", "refill"],
  ["lavable", "washable"],
]);

const DISPLAY_TOKENS = new Map([
  ["acido", "Ácido"],
  ["hialuronico", "Hialurónico"],
  ["kerastase", "Kérastase"],
  ["mascara", "Máscara"],
  ["oleo", "Óleo"],
  ["pestanas", "Pestañas"],
  ["waterproof", "Waterproof"],
  ["washable", "Washable"],
  ["refill", "Refill"],
  ["ml", "ml"],
  ["g", "g"],
]);

const TECHNICAL_STOP_PHRASES = [
  ["mascara", "de", "pestanas"],
  ["mascara", "pestanas"],
];

const TECHNICAL_STOP_WORDS = new Set([
  "articulo",
  "cosmetico",
  "producto",
  "vol",
  "volume",
]);

const PRODUCT_ALIASES = [
  {
    brand: "L'Oréal Paris",
    requiredTokens: ["panorama", "all", "night", "black"],
    forbiddenTokens: ["waterproof", "washable", "brown"],
    canonicalTokens: ["panorama", "all", "night", "black"],
    defaultSize: "9.9ml",
    canonicalIdentity:
      "L'oreal París Máscara de Pestañas L'Oréal París Panorama All Night Black",
  },
  {
    brand: "L'Oréal Paris",
    requiredTokens: ["panorama", "black", "waterproof"],
    forbiddenTokens: ["washable", "brown"],
    canonicalTokens: ["panorama", "black", "waterproof"],
    defaultSize: "9.9ml",
  },
];

export function normalizeComparisonText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .replace(/(\d)[,.](\d)/g, "$1.$2")
    .replace(/([0-9])([a-z])/g, "$1 $2")
    .replace(/([a-z])([0-9])/g, "$1 $2")
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\.(?!\d)/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function collapseRepeatedSequence(tokens) {
  for (let size = Math.floor(tokens.length / 2); size >= 3; size -= 1) {
    for (let start = 0; start + size * 2 <= tokens.length; start += 1) {
      const left = tokens.slice(start, start + size);
      const right = tokens.slice(start + size, start + size * 2);
      if (left.every((token, index) => token === right[index])) {
        return collapseRepeatedSequence([
          ...tokens.slice(0, start),
          ...left,
          ...tokens.slice(start + size * 2),
        ]);
      }
    }
  }

  return tokens;
}

function removePhrase(tokens, phrase) {
  const result = [];

  for (let index = 0; index < tokens.length; ) {
    const matches = phrase.every(
      (token, offset) => tokens[index + offset] === token,
    );
    if (matches) index += phrase.length;
    else {
      result.push(tokens[index]);
      index += 1;
    }
  }

  return result;
}

function applyVariantAliases(tokens) {
  let result = tokens;

  for (const { from, to } of VARIANT_ALIASES) {
    const expanded = [];
    for (let index = 0; index < result.length; ) {
      const matches = from.every(
        (token, offset) => result[index + offset] === token,
      );
      if (matches) {
        expanded.push(...to);
        index += from.length;
      } else {
        expanded.push(result[index]);
        index += 1;
      }
    }
    result = expanded;
  }

  return result;
}

function normalizeQuantityAliases(tokens) {
  const result = [];
  for (let index = 0; index < tokens.length; index += 1) {
    if (
      tokens[index] === "x" &&
      tokens[index + 1] === "1" &&
      /^(un|unidad)$/.test(tokens[index + 2] ?? "")
    ) {
      result.push("unidad");
      index += 2;
    } else {
      result.push(tokens[index]);
    }
  }
  return result;
}

function removeSingleItemSizePrefixes(tokens) {
  return tokens.filter(
    (token, index) =>
      !(
        token === "x" &&
        /^\d+(?:\.\d+)?$/.test(tokens[index + 1] ?? "") &&
        /^(ml|g|kg|l)$/.test(tokens[index + 2] ?? "")
      ),
  );
}

function deduplicateLongTitleTokens(tokens) {
  if (tokens.length < 8) return tokens;

  const seen = new Set();
  return tokens.filter((token) => {
    if (token.length <= 2 || !seen.has(token)) {
      seen.add(token);
      return true;
    }
    return false;
  });
}

function canonicalBrandFromNormalized(normalizedBrand) {
  const compact = normalizedBrand.replaceAll(" ", "");
  const match = BRAND_ALIASES.find(({ aliases }) =>
    aliases.some(
      (alias) => normalizeComparisonText(alias).replaceAll(" ", "") === compact,
    ),
  );
  return match?.canonical ?? null;
}

export function canonicalizeBrand(value = "") {
  const originalBrand = String(value).trim().replace(/\s+/g, " ");
  const normalizedBrand = normalizeComparisonText(originalBrand);
  return (
    canonicalBrandFromNormalized(normalizedBrand) ||
    originalBrand ||
    "Sin marca"
  );
}

function removeBrandTokens(tokens, brand) {
  const brandTokens = new Set([
    ...normalizeBrandIdentity(brand).split(" "),
    ...normalizeComparisonText(brand).split(" "),
  ]);
  return tokens.filter((token) => !brandTokens.has(token));
}

function normalizeBrandIdentity(brand) {
  if (brand === "L'Oréal Paris") return "loreal paris";
  return normalizeComparisonText(brand);
}

function extractSizeToken(tokens) {
  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (/^\d+(?:\.\d+)?$/.test(tokens[index]) && /^(ml|g|kg|l)$/.test(tokens[index + 1])) {
      return `${Number(tokens[index])}${tokens[index + 1]}`;
    }
  }
  return null;
}

function removeSizeParts(tokens, size) {
  const match = size?.match(/^(\d+(?:\.\d+)?)(ml|g|kg|l)$/);
  if (!match) return tokens;

  const result = [];
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index] === match[1] && tokens[index + 1] === match[2]) {
      index += 1;
    } else {
      result.push(tokens[index]);
    }
  }
  return result;
}

function applyKnownProductAlias(brand, tokens) {
  return PRODUCT_ALIASES.find(
    (alias) =>
      alias.brand === brand &&
      alias.requiredTokens.every((token) => tokens.includes(token)) &&
      alias.forbiddenTokens.every((token) => !tokens.includes(token)),
  );
}

function formatSize(size) {
  const match = size?.match(/^(\d+(?:\.\d+)?)(ml|g|kg|l)$/);
  if (!match) return null;
  return `${match[1].replace(".", ",")} ${match[2]}`;
}

function titleToken(token) {
  if (DISPLAY_TOKENS.has(token)) return DISPLAY_TOKENS.get(token);
  if (/^\d+(?:\.\d+)?$/.test(token)) return token.replace(".", ",");
  return token.charAt(0).toLocaleUpperCase("es") + token.slice(1);
}

function buildDisplayName(brand, tokens, size) {
  const words = removeSizeParts(tokens, size).map(titleToken);
  const formattedSize = formatSize(size);
  return [brand, ...words, formattedSize].filter(Boolean).join(" ");
}

export function normalizeProduct(product) {
  if (product?.canonicalizationVersion === 1) return product;

  const originalName = String(product?.originalName ?? product?.name ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const originalBrand = String(
    product?.originalBrand ?? product?.brand ?? "Sin marca",
  )
    .trim()
    .replace(/\s+/g, " ");
  const brand = canonicalizeBrand(originalBrand);
  let tokens = collapseRepeatedSequence(
    normalizeComparisonText(originalName)
      .split(" ")
      .filter(Boolean)
      .map((token) => TOKEN_ALIASES.get(token) ?? token),
  );
  tokens = applyVariantAliases(tokens);
  tokens = normalizeQuantityAliases(tokens);
  tokens = removeSingleItemSizePrefixes(tokens);

  for (const phrase of TECHNICAL_STOP_PHRASES) {
    tokens = removePhrase(tokens, phrase);
  }
  tokens = tokens.filter((token) => !TECHNICAL_STOP_WORDS.has(token));
  tokens = removeBrandTokens(tokens, brand);
  tokens = deduplicateLongTitleTokens(tokens);

  const explicitSize = extractSizeToken(tokens);
  const productAlias = applyKnownProductAlias(brand, tokens);
  const size = explicitSize ?? productAlias?.defaultSize ?? null;
  const canonicalTokens = productAlias?.canonicalTokens ?? tokens;
  const canonicalTokensWithoutSize = removeSizeParts(canonicalTokens, size);
  const sizeParts = size
    ? [size.replace(/[a-z]+$/, ""), size.match(/[a-z]+$/)?.[0]].filter(Boolean)
    : [];
  const normalizedBrand = normalizeBrandIdentity(brand);
  const normalizedName = [
    normalizedBrand,
    ...canonicalTokensWithoutSize,
    ...sizeParts,
  ]
    .filter(Boolean)
    .join(" ");
  const displayName = buildDisplayName(brand, canonicalTokens, size);
  const searchTokens = [
    ...new Set(
      [
        ...normalizedBrand.split(" "),
        ...canonicalTokensWithoutSize,
        size,
      ].filter(Boolean),
    ),
  ];

  return {
    ...product,
    originalName,
    originalBrand,
    canonicalProductIdentity:
      productAlias?.canonicalIdentity && size === productAlias.defaultSize
        ? productAlias.canonicalIdentity
        : null,
    normalizedName,
    displayName,
    searchTokens,
    brand,
    name: displayName,
    canonicalizationVersion: 1,
  };
}

export const productCanonicalizationRules = Object.freeze({
  brandAliases: BRAND_ALIASES.map(({ canonical, aliases }) => ({
    canonical,
    aliases: [...aliases],
  })),
  tokenAliases: Object.fromEntries(TOKEN_ALIASES),
  variantAliases: VARIANT_ALIASES.map(({ from, to }) => ({
    from: from.join(" "),
    to: to.join(" "),
  })),
  ignoredWords: [...TECHNICAL_STOP_WORDS],
});
