import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createApp } from "../src/app.js";
import { SearchServiceError } from "../src/services/productSearch.js";

const calls = [];
const searchService = {
  async search(query) {
    calls.push(query);
    if (query === "error") {
      throw new SearchServiceError("STORE_UNAVAILABLE", "Tienda no disponible.", 502);
    }
    return query === "vacío" ? [] : [{ id: "real-product" }];
  },
};

const app = createApp({ searchService });
let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("requires a non-empty q parameter", async () => {
  for (const suffix of ["", "?q=%20%20"]) {
    const response = await fetch(`${baseUrl}/api/search${suffix}`);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_QUERY");
  }
});

test("limits query length", async () => {
  const response = await fetch(`${baseUrl}/api/search?q=${"a".repeat(81)}`);
  assert.equal(response.status, 400);
});

test("trims q and returns results", async () => {
  const response = await fetch(`${baseUrl}/api/search?q=%20maybelline%20`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    query: "maybelline",
    results: [{ id: "real-product" }],
  });
  assert.equal(calls.at(-1), "maybelline");
});

test("returns an empty results array", async () => {
  const response = await fetch(`${baseUrl}/api/search?q=vac%C3%ADo`);
  assert.deepEqual(await response.json(), { query: "vacío", results: [] });
});

test("returns a controlled external error without a stack trace", async () => {
  const response = await fetch(`${baseUrl}/api/search?q=error`);
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.deepEqual(body, {
    error: {
      code: "STORE_UNAVAILABLE",
      message: "Tienda no disponible.",
    },
  });
  assert.equal("stack" in body, false);
});

