import assert from "node:assert/strict";
import test from "node:test";

import { createFarmacityStore } from "../src/stores/farmacity/search.js";
import { createPigmentoStore } from "../src/stores/pigmento/search.js";

function vtexPayload(link) {
  return [
    {
      productId: "10",
      productName: "Máscara Sky High",
      brand: "Maybelline",
      link,
      items: [
        {
          itemId: "20",
          nameComplete: "Máscara Sky High",
          images: [{ imageUrl: "https://images.example/product.jpg" }],
          sellers: [
            {
              commertialOffer: {
                Price: 15000,
                ListPrice: 20000,
                IsAvailable: true,
                AvailableQuantity: 4,
              },
            },
          ],
        },
      ],
    },
  ];
}

for (const [name, createStore, origin] of [
  ["Farmacity", createFarmacityStore, "https://www.farmacity.com"],
  [
    "Pigmento",
    createPigmentoStore,
    "https://www.perfumeriaspigmento.com.ar",
  ],
]) {
  test(`${name} uses its catalog and normalizes the store`, async () => {
    let requestedUrl;
    const store = createStore({
      fetchImpl: async (url) => {
        requestedUrl = url;
        return {
          ok: true,
          json: async () => vtexPayload(`${origin}/sky-high/p`),
        };
      },
    });

    const [product] = await store.search("  sky high  ");
    assert.match(requestedUrl, new RegExp(`^${origin.replaceAll(".", "\\.")}`));
    assert.match(requestedUrl, /search\/sky%20high/);
    assert.equal(product.store, name);
    assert.equal(product.currentPrice, 15000);
    assert.equal(product.discountPercentage, 25);
  });
}
