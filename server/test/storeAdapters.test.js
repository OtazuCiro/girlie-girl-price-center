import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createFarmacityStore } from "../src/stores/farmacity/search.js";
import { createFarmaonlineStore } from "../src/stores/farmaonline/search.js";
import { createFarmaplusStore } from "../src/stores/farmaplus/search.js";
import { createPigmentoStore } from "../src/stores/pigmento/search.js";
import { createSimplicityStore } from "../src/stores/simplicity/search.js";

const fixture = JSON.parse(
  await readFile(new URL("./fixtures/vtex-products.json", import.meta.url), "utf8"),
);

for (const [name, createStore, origin] of [
  ["Farmacity", createFarmacityStore, "https://www.farmacity.com"],
  ["Pigmento", createPigmentoStore, "https://www.perfumeriaspigmento.com.ar"],
  ["Farmaonline", createFarmaonlineStore, "https://www.farmaonline.com"],
  ["Farmaplus", createFarmaplusStore, "https://www.farmaplus.com.ar"],
  ["Simplicity", createSimplicityStore, "https://www.simplicity.com.ar"],
]) {
  test(`${name} parses its public catalog`, async () => {
    let requestedUrl;
    const store = createStore({
      fetchImpl: async (url) => {
        requestedUrl = url;
        return {
          ok: true,
          json: async () =>
            fixture.map((entry) => ({
              ...entry,
              link: `${origin}${entry.link}`,
            })),
        };
      },
    });

    const [product] = await store.search("  sky high  ");
    assert.match(requestedUrl, new RegExp(`^${origin.replaceAll(".", "\\.")}`));
    assert.match(requestedUrl, /search\/sky%20high/);
    assert.equal(product.store, name);
    assert.equal(product.brand, "Maybelline");
    assert.equal(product.name, "Máscara Sky High Waterproof 7,2 ml");
    assert.equal(product.currentPrice, 15000);
    assert.equal(product.previousPrice, 20000);
    assert.equal(product.discountPercentage, 25);
    assert.equal(product.inStock, true);
    assert.equal(product.imageUrl, "https://images.example/product.jpg");
    assert.equal(product.productUrl, `${origin}/mascara-sky-high-waterproof/p`);
    assert.match(product.name, /7,2 ml/);
  });

  test(`${name} accepts empty results and controls HTTP errors`, async () => {
    const emptyStore = createStore({
      fetchImpl: async () => ({ ok: true, json: async () => [] }),
    });
    assert.deepEqual(await emptyStore.search("sin resultados"), []);

    const failingStore = createStore({
      fetchImpl: async () => ({ ok: false, status: 503 }),
    });
    await assert.rejects(failingStore.search("mascara"), /503/);
  });
}
