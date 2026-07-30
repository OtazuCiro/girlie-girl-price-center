import { describe, expect, it } from "vitest";

import {
  FAVORITES_STORAGE_KEY,
  createFavoritesStorage,
} from "./favoritesStorage.js";

function favorite(overrides = {}) {
  return {
    productKey: "product-sky-high",
    brand: "Maybelline",
    name: "Máscara Sky High 7,2 ml",
    imageUrl: "/sky-high.png",
    searchQuery: "Maybelline Máscara Sky High 7,2 ml",
    offerIds: ["farmacity-1", "pigmento-2"],
    ...overrides,
  };
}

describe("favoritesStorage", () => {
  it("handles empty and corrupt storage", () => {
    const storage = createFavoritesStorage(localStorage);
    expect(storage.getAll()).toEqual([]);

    localStorage.setItem(FAVORITES_STORAGE_KEY, "{not-json");
    expect(storage.getAll()).toEqual([]);
  });

  it("persists and restores favorites", () => {
    createFavoritesStorage(localStorage).add(favorite());
    const restored = createFavoritesStorage(localStorage).getAll();

    expect(restored).toEqual([favorite()]);
  });

  it("survives editorial display name changes without duplicating the favorite", () => {
    const storage = createFavoritesStorage(localStorage);
    storage.add(favorite());
    storage.add(favorite({ name: "Nombre actualizado" }));

    expect(storage.getAll()).toHaveLength(1);
    expect(storage.getAll()[0].name).toBe("Nombre actualizado");
    expect(storage.has("product-sky-high")).toBe(true);
    storage.remove("product-sky-high");
    expect(storage.has("product-sky-high")).toBe(false);
  });

  it("tolerates unavailable localStorage", () => {
    const unavailable = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    };
    const storage = createFavoritesStorage(unavailable);

    expect(storage.getAll()).toEqual([]);
    expect(storage.add(favorite())).toEqual([favorite()]);
    expect(storage.has("product-sky-high")).toBe(false);
  });
});
