import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCatalogFamilies,
  createProductFamilyKey,
  createProductKey,
  groupEquivalentProducts,
  normalizeProductText,
} from "../src/services/productGrouping.js";

function product(overrides = {}) {
  return {
    id: "base",
    name: "Máscara Lash Sensational Sky High 7,2 ml",
    brand: "Maybelline",
    currentPrice: 20000,
    previousPrice: null,
    discountPercentage: null,
    imageUrl: "",
    store: "Juleriaque",
    productUrl: "https://example.com/product",
    inStock: true,
    ...overrides,
  };
}

test("normalizes accents, punctuation and spacing", () => {
  assert.equal(
    normalizeProductText("  Ácido   Hialurónico—30ML "),
    "acido hialuronico 30 ml",
  );
});

test("groups conservative equivalents and calculates best price and savings", () => {
  const groups = groupEquivalentProducts([
    product(),
    product({
      id: "farmacity",
      name: "Maybelline Máscara Lash Sensational Sky High 7.2 ml",
      store: "Farmacity",
      currentPrice: 17000,
    }),
    product({
      id: "pigmento",
      name: "Máscara Lash Sensational Sky High 7,2ml",
      store: "Pigmento",
      currentPrice: 18500,
    }),
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].offers.length, 3);
  assert.equal(groups[0].bestPriceOfferId, "farmacity");
  assert.equal(groups[0].savings, 1500);
});

test("creates a stable identity independent from price, stock and result order", () => {
  const original = product();
  const changedOffer = product({
    currentPrice: 999,
    inStock: false,
    store: "Farmacity",
    productUrl: "https://another.example/offer",
  });

  assert.equal(createProductKey(original), createProductKey(changedOffer));

  const first = groupEquivalentProducts([
    original,
    product({ id: "second", store: "Pigmento", currentPrice: 18000 }),
  ]);
  const reordered = groupEquivalentProducts([
    product({ id: "second", store: "Pigmento", currentPrice: 25000 }),
    { ...original, currentPrice: 15000 },
  ]);

  assert.equal(first[0].productKey, reordered[0].productKey);
});

test("does not mix brands, sizes or strong variants", () => {
  const groups = groupEquivalentProducts([
    product(),
    product({ id: "brand", brand: "L'Oréal", store: "Farmacity" }),
    product({
      id: "size",
      name: "Máscara Lash Sensational Sky High 10 ml",
      store: "Farmacity",
    }),
    product({
      id: "waterproof",
      name: "Máscara Lash Sensational Sky High Waterproof 7,2 ml",
      store: "Pigmento",
    }),
  ]);

  assert.equal(groups.length, 4);
  assert.ok(groups.every((group) => group.offers.length === 1));
});

test("detects a strong variant declared only in the product URL", () => {
  const groups = groupEquivalentProducts([
    product({ name: "Máscara Firework Electro Black" }),
    product({
      id: "waterproof-url",
      name: "Máscara Firework Electro Black",
      store: "Farmacity",
      productUrl: "https://example.com/mascara-firework-waterproof/p",
    }),
  ]);

  assert.equal(groups.length, 2);
});

test("does not group a product whose URL declares a conflicting brand", () => {
  const groups = groupEquivalentProducts([
    product({
      id: "loreal",
      brand: "L'Oréal Paris",
      name: "Sombra en Barra Le Shadow Stick",
      productUrl: "https://example.com/loreal-le-shadow-stick/p",
    }),
    product({
      id: "conflicting-catalog-brand",
      brand: "L'Oréal Paris",
      name: "Sombra de Ojos en Barra Le Shadow Stick",
      store: "Pigmento",
      productUrl: "https://example.com/maybelline-le-shadow-stick/p",
    }),
  ]);

  assert.equal(groups.length, 2);
});

test("ignores out-of-stock offers for best price and keeps unmatched products", () => {
  const groups = groupEquivalentProducts([
    product({ id: "sold-out", currentPrice: 10000, inStock: false }),
    product({ id: "available", store: "Farmacity", currentPrice: 19000 }),
    product({
      id: "different",
      name: "Labial Superstay Matte Ink",
      store: "Pigmento",
      currentPrice: 12000,
    }),
  ]);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].bestPriceOfferId, "different");
  const mascara = groups.find((group) => group.offers.length === 2);
  assert.equal(mascara.bestPriceOfferId, "available");
  assert.equal(mascara.savings, null);
});

test("gives exact products and conceptual families stable distinct identities", () => {
  const single = product({ name: "Óleo Extraordinario 100 ml", brand: "L'Oréal" });
  const changed = { ...single, currentPrice: 1, inStock: false };
  const pack = { ...single, name: "Óleo Extraordinario 100 ml pack x2" };

  assert.equal(createProductKey(single), createProductKey(changed));
  assert.equal(createProductFamilyKey(single), createProductFamilyKey(pack));
  assert.notEqual(createProductKey(single), createProductKey(pack));
});

test("classifies and relates single, packs and mixed sets without competition", () => {
  const groups = groupEquivalentProducts([
    product({ id: "single", name: "Óleo Extraordinario 100 ml", brand: "L'Oréal", currentPrice: 12000 }),
    product({ id: "pack-2", name: "Óleo Extraordinario 100 ml pack x2", brand: "L'Oréal", store: "Farmacity", currentPrice: 22000 }),
    product({ id: "pack-3", name: "Óleo Extraordinario 100 ml pack x3", brand: "L'Oréal", store: "Pigmento", currentPrice: 30000 }),
    product({ id: "kit", name: "Kit Óleo Extraordinario + Shampoo", brand: "L'Oréal", store: "Farmaonline", currentPrice: 35000 }),
  ]);
  const [family] = buildCatalogFamilies(groups);

  assert.equal(groups.length, 4);
  assert.deepEqual(groups.map(({ productType }) => productType).sort(), ["pack", "pack", "set", "single"]);
  assert.equal(family.packs.length, 2);
  assert.equal(family.sets.length, 1);
  assert.equal(family.primary.lowestPrice, 12000);
  assert.deepEqual(family.packs.map(({ packCount }) => packCount).sort(), [2, 3]);
});

test("relates sizes while keeping exact best prices separate", () => {
  const groups = groupEquivalentProducts([
    product({ id: "100", name: "Óleo Extraordinario 100 ml", brand: "L'Oréal", currentPrice: 12000 }),
    product({ id: "50", name: "Óleo Extraordinario 50 ml", brand: "L'Oréal", store: "Farmacity", currentPrice: 8000 }),
  ]);
  const [family] = buildCatalogFamilies(groups);

  assert.equal(groups.length, 2);
  assert.equal(family.variants.length, 1);
  assert.notEqual(family.primary.productKey, family.variants[0].productKey);
});

test("calculates unit price and reliable best value", () => {
  const groups = groupEquivalentProducts([
    product({ id: "single", name: "Óleo Extraordinario 100 ml", brand: "L'Oréal", currentPrice: 12000 }),
    product({ id: "pack", name: "Óleo Extraordinario 100 ml pack x2", brand: "L'Oréal", store: "Farmacity", currentPrice: 20000 }),
  ]);
  const [family] = buildCatalogFamilies(groups);

  assert.equal(family.packs[0].unitPrice, 10000);
  assert.equal(family.bestValueProductKey, family.packs[0].productKey);
});

test("avoids unrelated false positives and never gives mixed sets a unit price", () => {
  const groups = groupEquivalentProducts([
    product({ id: "oil", name: "Óleo Extraordinario 100 ml", brand: "L'Oréal" }),
    product({ id: "different", name: "Shampoo Hidratación Intensa 400 ml", brand: "L'Oréal", store: "Farmacity" }),
    product({ id: "set", name: "Kit Óleo Extraordinario + Shampoo", brand: "L'Oréal", store: "Pigmento" }),
  ]);
  const families = buildCatalogFamilies(groups);
  const oilFamily = families.find((family) => family.sets.length);

  assert.equal(families.length, 2);
  assert.equal(oilFamily.sets[0].unitPrice, null);
  assert.equal(oilFamily.bestValueProductKey, null);
});

test("does not confuse the common x plus measurement notation with a pack", () => {
  const [group] = groupEquivalentProducts([
    product({ name: "Máscara Sky High x 7,2 ml" }),
  ]);

  assert.equal(group.productType, "single");
  assert.equal(group.packCount, null);
});

test("does not claim best value when a pack count is unknown", () => {
  const groups = groupEquivalentProducts([
    product({ id: "single", name: "Shampoo Nutritivo 400 ml" }),
    product({
      id: "pack",
      name: "Pack Shampoo Nutritivo 400 ml",
      store: "Farmacity",
      currentPrice: 10000,
    }),
  ]);
  const [family] = buildCatalogFamilies(groups);

  assert.equal(family.packs[0].packCount, null);
  assert.equal(family.packs[0].unitPrice, null);
  assert.equal(family.bestValueProductKey, null);
});
