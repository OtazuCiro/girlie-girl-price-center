function normalizeIdentity(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizedProductName(brand, name) {
  const normalizedBrand = normalizeIdentity(brand);
  const normalizedName = normalizeIdentity(name);
  return normalizedName.startsWith(`${normalizedBrand} `)
    ? normalizedName.slice(normalizedBrand.length + 1)
    : normalizedName;
}

export function buildProductSearchQuery({ brand, displayName, name }) {
  const productName = String(displayName ?? name ?? "").trim();
  const normalizedBrand = normalizeIdentity(brand);
  const normalizedName = normalizeIdentity(productName);
  const query =
    normalizedBrand && normalizedName.startsWith(`${normalizedBrand} `)
      ? productName
      : `${brand ?? ""} ${productName}`.trim();
  return query.slice(0, 80);
}

export function hasOffers(group) {
  return Boolean(group?.offers?.length);
}

export function selectPrimaryOffer(group) {
  if (!hasOffers(group)) return null;
  return (
    group.offers.find((offer) => offer.id === group.bestPriceOfferId) ??
    group.offers.find((offer) => offer.inStock) ??
    group.offers[0]
  );
}

export function matchesFavorite(group, favorite) {
  if (!group || !favorite) return false;
  if (group.productKey === favorite.productKey) return true;

  const knownOfferIds = new Set(favorite.offerIds ?? []);
  if (group.offers?.some((offer) => knownOfferIds.has(offer.id))) return true;

  return (
    normalizeIdentity(group.brand) === normalizeIdentity(favorite.brand) &&
    normalizedProductName(group.brand, group.displayName ?? group.name) ===
      normalizedProductName(favorite.brand, favorite.name)
  );
}

export function resolveFavoriteGroup(groups, favorite) {
  if (!Array.isArray(groups)) return null;
  return groups.find((group) => matchesFavorite(group, favorite)) ?? null;
}

export function keepFreshestProduct(currentGroup, incomingGroup) {
  if (hasOffers(currentGroup) && !hasOffers(incomingGroup)) return currentGroup;
  return incomingGroup ?? currentGroup ?? null;
}

export function mergeFavoriteUpdates(current, updates) {
  const merged = { ...current };
  for (const { productKey, group } of updates) {
    merged[productKey] = keepFreshestProduct(merged[productKey], group);
  }
  return merged;
}
