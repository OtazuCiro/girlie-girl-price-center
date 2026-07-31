import assert from "node:assert/strict";
import test from "node:test";

import {
  DatabaseConfigurationError,
  resolveDatabaseConfig,
} from "../src/history/databaseConfig.js";

test("keeps price history disabled without credentials", () => {
  assert.deepEqual(resolveDatabaseConfig({}), { enabled: false });
});

test("accepts a database only when its role matches the Vercel environment", () => {
  const config = resolveDatabaseConfig({
    DATABASE_URL: "postgres://example",
    VERCEL_ENV: "preview",
    PRICE_HISTORY_DATABASE_ROLE: "preview",
  });

  assert.equal(config.enabled, true);
  assert.equal(config.role, "preview");
});

test("rejects a production role in Preview", () => {
  assert.throws(
    () =>
      resolveDatabaseConfig({
        DATABASE_URL: "postgres://example",
        VERCEL_ENV: "preview",
        PRICE_HISTORY_DATABASE_ROLE: "production",
      }),
    DatabaseConfigurationError,
  );
});
