import { buildProductSearchQuery } from "../products/currentProduct.js";

export const FAVORITES_STORAGE_KEY = "girlieGirl:favorites:v1";

function resolveStorage(storage) {
  if (storage) return storage;

  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function validFavorite(value) {
  return (
    value &&
    typeof value.productKey === "string" &&
    typeof value.brand === "string" &&
    typeof value.name === "string" &&
    typeof value.imageUrl === "string" &&
    typeof value.searchQuery === "string" &&
    Array.isArray(value.offerIds) &&
    value.offerIds.every((id) => typeof id === "string")
  );
}

export function createFavoritesStorage(storage) {
  const target = resolveStorage(storage);

  function getAll() {
    if (!target) return [];

    try {
      const parsed = JSON.parse(target.getItem(FAVORITES_STORAGE_KEY) ?? "[]");
      if (!Array.isArray(parsed)) return [];

      return [...new Map(parsed.filter(validFavorite).map((item) => [item.productKey, item])).values()];
    } catch {
      return [];
    }
  }

  function write(items) {
    if (!target) return false;

    try {
      target.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch {
      return false;
    }
  }

  return {
    getAll,

    add(favorite) {
      if (!validFavorite(favorite)) return getAll();
      const items = getAll();
      const existingIndex = items.findIndex(
        (item) => item.productKey === favorite.productKey,
      );

      if (existingIndex >= 0) items[existingIndex] = favorite;
      else items.push(favorite);
      write(items);
      return items;
    },

    remove(productKey) {
      const items = getAll().filter((item) => item.productKey !== productKey);
      write(items);
      return items;
    },

    has(productKey) {
      return getAll().some((item) => item.productKey === productKey);
    },
  };
}

export const favoritesStorage = createFavoritesStorage();

export function favoriteFromGroup(group) {
  return {
    productKey: group.productKey,
    brand: group.brand,
    name: group.displayName ?? group.name,
    imageUrl: group.imageUrl || "",
    searchQuery: buildProductSearchQuery(group),
    offerIds: group.offers.map((offer) => offer.id),
  };
}
