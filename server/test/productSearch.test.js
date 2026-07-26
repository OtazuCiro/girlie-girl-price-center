import assert from "node:assert/strict";
import test from "node:test";

import { createProductSearchService } from "../src/services/productSearch.js";

test("caches normalized searches within the TTL", async () => {
  let calls = 0;
  let timestamp = 1000;
  const expected = [{ id: "product-1" }];
  const service = createProductSearchService({
    store: {
      async search() {
        calls += 1;
        return expected;
      },
    },
    ttlMs: 100,
    now: () => timestamp,
  });

  assert.equal(await service.search("  Maybelline "), expected);
  timestamp += 50;
  assert.equal(await service.search("maybelline"), expected);
  assert.equal(calls, 1);

  timestamp += 100;
  await service.search("maybelline");
  assert.equal(calls, 2);
});

