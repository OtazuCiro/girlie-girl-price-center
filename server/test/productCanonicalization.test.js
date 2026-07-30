import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalizeBrand,
  normalizeProduct,
} from "../src/services/productCanonicalization.js";
import {
  createProductKey,
  groupEquivalentProducts,
} from "../src/services/productGrouping.js";

const PANORAMA_NAMES = [
  "Mascara De Pestañas L'Oréal París Vol Panorama Black Wtp x 9,9 ml Mascara De Pestañas L'Oréal París Vol Panorama Black Wtp x 9,9 ml",
  "Volume Panorama Black Waterproof",
  "Mascara De Pestañas L'Oréal París Panorama Black Waterproof",
  "Mascara de pestañas panorama black wtp",
];

function offer(name, overrides = {}) {
  return {
    id: overrides.store ?? "Juleriaque",
    name,
    brand: overrides.brand ?? "L'Oreal Paris",
    currentPrice: 10000,
    previousPrice: null,
    discountPercentage: null,
    imageUrl: "",
    store: "Juleriaque",
    productUrl: "https://example.com/panorama",
    inStock: true,
    ...overrides,
  };
}

test("maps explicit brand aliases to a maintainable canonical brand", () => {
  for (const alias of ["Loreal", "L Oreal", "L'Oréal", "Loreal Paris"]) {
    assert.equal(canonicalizeBrand(alias), "L'Oréal Paris");
  }
  assert.equal(canonicalizeBrand("Maybelline New York"), "Maybelline");
  assert.equal(canonicalizeBrand("Maybelline"), "Maybelline");
});

test("keeps the original name and canonicalizes real Panorama variants", () => {
  const products = PANORAMA_NAMES.map((name) =>
    normalizeProduct(offer(name)),
  );

  assert.equal(products[0].originalName, PANORAMA_NAMES[0]);
  assert.ok(
    products.every(
      ({ normalizedName }) =>
        normalizedName ===
        "loreal paris panorama black waterproof 9.9 ml",
    ),
  );
  assert.ok(
    products.every(
      ({ displayName }) =>
        displayName === "L'Oréal Paris Panorama Black Waterproof 9,9 ml",
    ),
  );
  assert.ok(
    products.every(
      ({ searchTokens }) =>
        searchTokens.length === new Set(searchTokens).size,
    ),
  );
});

test("removes a repeated phrase without losing differentiating information", () => {
  const repeated = normalizeProduct(offer(PANORAMA_NAMES[0]));

  assert.equal(
    repeated.displayName,
    "L'Oréal Paris Panorama Black Waterproof 9,9 ml",
  );
  assert.match(repeated.normalizedName, /black waterproof 9\.9 ml$/);
});

test("summarizes long duplicated catalog titles without ellipsis", () => {
  const product = normalizeProduct(
    offer(
      "Nutritive New Nectar Thermique Nutritive Nectar Thermique 50 ml",
      { brand: "Kerastase" },
    ),
  );

  assert.equal(
    product.displayName,
    "Kérastase Nutritive New Nectar Thermique 50 ml",
  );
  assert.doesNotMatch(product.displayName, /\.\.\.|…/);
});

test("groups canonical Panorama offers and exposes the same display name", () => {
  const stores = ["Simplicity", "Juleriaque", "Farmacity", "Farmaonline"];
  const groups = groupEquivalentProducts(
    PANORAMA_NAMES.map((name, index) =>
      offer(name, { id: stores[index], store: stores[index] }),
    ),
  );

  assert.equal(groups.length, 1);
  assert.equal(groups[0].offers.length, 4);
  assert.equal(
    groups[0].displayName,
    "L'Oréal Paris Panorama Black Waterproof 9,9 ml",
  );
  assert.ok(
    groups[0].offers.every(
      ({ displayName }) => displayName === groups[0].displayName,
    ),
  );
  assert.deepEqual(
    groups[0].offers.map(({ historyProductKey }) => historyProductKey).sort(),
    PANORAMA_NAMES.map((name, index) =>
      createProductKey(
        offer(name, { id: stores[index], store: stores[index] }),
      ),
    ).sort(),
  );
});

test("keeps waterproof, washable, colors and sizes distinct", () => {
  const groups = groupEquivalentProducts([
    offer("Panorama Black Waterproof 9,9 ml", {
      id: "black-waterproof",
      store: "Juleriaque",
    }),
    offer("Panorama Black Washable 9,9 ml", {
      id: "black-washable",
      store: "Farmacity",
    }),
    offer("Panorama Brown Waterproof 9,9 ml", {
      id: "brown-waterproof",
      store: "Pigmento",
    }),
    offer("Panorama Black Waterproof 7,2 ml", {
      id: "different-size",
      store: "Simplicity",
    }),
  ]);

  assert.equal(groups.length, 4);
});

test("editorial display changes do not alter the legacy product key", () => {
  const raw = offer("Volume Panorama Black Waterproof");
  const canonical = normalizeProduct(raw);
  const editorialUpdate = {
    ...canonical,
    name: "Nuevo título editorial",
    displayName: "Nuevo título editorial",
  };

  assert.equal(createProductKey(raw), createProductKey(canonical));
  assert.equal(createProductKey(canonical), createProductKey(editorialUpdate));
});

test("normalization is deterministic and runs only once per offer", () => {
  const canonical = normalizeProduct(offer(PANORAMA_NAMES[0]));

  assert.equal(normalizeProduct(canonical), canonical);
  assert.deepEqual(
    normalizeProduct(offer(PANORAMA_NAMES[0])),
    normalizeProduct(offer(PANORAMA_NAMES[0])),
  );
});
