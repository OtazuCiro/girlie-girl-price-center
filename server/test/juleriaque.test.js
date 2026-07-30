import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  JuleriaqueStoreError,
  createJuleriaqueStore,
  parseJuleriaqueResponse,
} from "../src/stores/juleriaque/search.js";

const fixture = JSON.parse(
  await readFile(
    new URL("./fixtures/juleriaque-products.json", import.meta.url),
    "utf8",
  ),
);

test("parses and normalizes Juleriaque products", () => {
  const [available, soldOut] = parseJuleriaqueResponse(fixture);

  assert.equal(available.id, "juleriaque-15493-22951");
  assert.equal(
    available.originalName,
    "Colossal Bubble Waterproof Very Black",
  );
  assert.equal(
    available.displayName,
    "Maybelline Colossal Bubble Waterproof Very Black",
  );
  assert.equal(available.name, available.displayName);
  assert.equal(available.originalBrand, "MAYBELLINE");
  assert.equal(available.brand, "Maybelline");
  assert.equal(
    available.normalizedName,
    "maybelline colossal bubble waterproof very black",
  );
  assert.equal(available.currentPrice, 35990);
  assert.equal(available.previousPrice, 44990);
  assert.equal(available.discountPercentage, 20);
  assert.equal(
    available.imageUrl,
    "https://juleriaque.vteximg.com.br/arquivos/ids/272174/3012201.jpg",
  );
  assert.equal(available.store, "Juleriaque");
  assert.equal(
    available.productUrl,
    "https://www.juleriaque.com.ar/colossal-bubble-904882/p",
  );
  assert.equal(available.inStock, true);
  assert.equal(typeof available.currentPrice, "number");
  assert.equal(soldOut.inStock, false);
  assert.equal(soldOut.previousPrice, null);
  assert.equal(soldOut.discountPercentage, null);
});

test("accepts an empty result list", () => {
  assert.deepEqual(parseJuleriaqueResponse([]), []);
});

test("rejects an unexpected store response", () => {
  assert.throws(
    () => parseJuleriaqueResponse({ products: [] }),
    (error) =>
      error instanceof JuleriaqueStoreError &&
      error.code === "UNEXPECTED_RESPONSE",
  );
});

test("controls external HTTP errors", async () => {
  const store = createJuleriaqueStore({
    fetchImpl: async () => ({ ok: false, status: 503 }),
  });

  await assert.rejects(
    store.search("maybelline"),
    (error) =>
      error instanceof JuleriaqueStoreError && error.code === "HTTP_ERROR",
  );
});

test("aborts slow store requests", async () => {
  const store = createJuleriaqueStore({
    timeoutMs: 10,
    fetchImpl: async (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      }),
  });

  await assert.rejects(
    store.search("shampoo"),
    (error) =>
      error instanceof JuleriaqueStoreError && error.code === "STORE_TIMEOUT",
  );
});
