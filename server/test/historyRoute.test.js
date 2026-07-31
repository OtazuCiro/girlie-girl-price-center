import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createApp } from "../src/app.js";

const historyService = {
  enabled: true,
  async getHistory(productKey, store, limit) {
    return {
      productKey,
      store,
      limit,
      summary: { latestPrice: 10000 },
      snapshots: [],
    };
  },
};
const app = createApp({ historyService });
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

test("requires a product and store", async () => {
  const response = await fetch(`${baseUrl}/api/history/product-1`);
  assert.equal(response.status, 400);
});

test("limits the number of returned snapshots", async () => {
  const response = await fetch(
    `${baseUrl}/api/history/product-1?store=Farmacity&limit=500`,
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).limit, 50);
});

test("does not expose internal errors", async () => {
  const failingApp = createApp({
    historyService: {
      enabled: true,
      async getHistory() {
        throw new Error("postgres://secret@host/database");
      },
    },
  });
  const failingServer = await new Promise((resolve) => {
    const listener = failingApp.listen(0, "127.0.0.1", () => resolve(listener));
  });
  const response = await fetch(
    `http://127.0.0.1:${failingServer.address().port}/api/history/product-1?store=Farmacity`,
  );
  const body = await response.json();
  await new Promise((resolve) => failingServer.close(resolve));

  assert.equal(response.status, 503);
  assert.equal(JSON.stringify(body).includes("postgres"), false);
  assert.equal(JSON.stringify(body).includes("secret"), false);
});
