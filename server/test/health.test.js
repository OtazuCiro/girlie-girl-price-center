import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import app from "../src/app.js";
import vercelBeautyRadarHandler from "../../api/beauty-radar.js";
import vercelHealthHandler from "../../api/health.js";
import vercelHistoryHandler from "../../api/history/[productKey].js";
import vercelSearchHandler from "../../api/search.js";

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("GET /api/health responds with an ok status", async () => {
  const response = await fetch(`${baseUrl}/api/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("the Vercel entry points export the same Express app", () => {
  assert.equal(vercelHealthHandler, app);
  assert.equal(vercelBeautyRadarHandler, app);
  assert.equal(vercelHistoryHandler, app);
  assert.equal(vercelSearchHandler, app);
});
