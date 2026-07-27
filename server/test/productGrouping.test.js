import assert from "node:assert/strict";
import test from "node:test";

import {
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

test("keeps a unit, pack x2 and pack x3 as separate exact products", () => {
  const groups = groupEquivalentProducts([
    product({ id: "single", name: "Óleo Extraordinario 100 ml", brand: "L'Oréal", currentPrice: 12000 }),
    product({ id: "pack-2", name: "Óleo Extraordinario 100 ml pack x2", brand: "L'Oréal", store: "Farmacity", currentPrice: 22000 }),
    product({ id: "pack-3", name: "Óleo Extraordinario 100 ml pack x3", brand: "L'Oréal", store: "Pigmento", currentPrice: 30000 }),
  ]);

  assert.equal(groups.length, 3);
  assert.ok(groups.every((group) => group.offers.length === 1));
});

test("keeps different sizes as separate exact products", () => {
  const groups = groupEquivalentProducts([
    product({ id: "100", name: "Óleo Extraordinario 100 ml", brand: "L'Oréal", currentPrice: 12000 }),
    product({ id: "50", name: "Óleo Extraordinario 50 ml", brand: "L'Oréal", store: "Farmacity", currentPrice: 8000 }),
  ]);

  assert.equal(groups.length, 2);
});

test("keeps a set separate from an individual product", () => {
  const groups = groupEquivalentProducts([
    product({ id: "single", name: "Óleo Extraordinario 100 ml", brand: "L'Oréal", currentPrice: 12000 }),
    product({ id: "set", name: "Kit Óleo Extraordinario + Shampoo", brand: "L'Oréal", store: "Farmacity", currentPrice: 20000 }),
  ]);

  assert.equal(groups.length, 2);
});

test("groups the same exact set from two stores", () => {
  const groups = groupEquivalentProducts([
    product({ id: "set-a", name: "Daywear Skincare Set", brand: "Estée Lauder" }),
    product({ id: "set-b", name: "Daywear Skincare Set", brand: "Estée Lauder", store: "Farmacity", currentPrice: 18000 }),
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].offers.length, 2);
  assert.equal(groups[0].bestPriceOfferId, "set-b");
});

test("keeps refill and complete product separate", () => {
  const groups = groupEquivalentProducts([
    product({ name: "Crema Hidratante 50 ml" }),
    product({ id: "refill", name: "Crema Hidratante Refill 50 ml", store: "Farmacity" }),
  ]);

  assert.equal(groups.length, 2);
});
