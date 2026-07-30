import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";

import { neon } from "@neondatabase/serverless";

import { resolveDatabaseConfig } from "../src/history/databaseConfig.js";

const requestedTarget = process.env.MIGRATION_TARGET;
const config = resolveDatabaseConfig();

if (!config.enabled) throw new Error("DATABASE_URL is required.");
if (!requestedTarget || requestedTarget !== config.role) {
  throw new Error("MIGRATION_TARGET must match PRICE_HISTORY_DATABASE_ROLE.");
}
if (config.role === "production" && process.env.ALLOW_PRODUCTION_MIGRATIONS !== "true") {
  throw new Error("Production migrations require ALLOW_PRODUCTION_MIGRATIONS=true.");
}

const sql = neon(config.connectionString);
await sql`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    checksum TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

const migrationsUrl = new URL("../migrations/", import.meta.url);
const migrationFiles = (await readdir(migrationsUrl))
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort();

for (const file of migrationFiles) {
  const source = await readFile(new URL(file, migrationsUrl), "utf8");
  const checksum = createHash("sha256").update(source).digest("hex");
  const existing = await sql`
    SELECT checksum FROM schema_migrations WHERE version = ${file}
  `;

  if (existing.length) {
    if (existing[0].checksum !== checksum) {
      throw new Error(`Migration ${file} changed after being applied.`);
    }
    continue;
  }

  const statements = source
    .split("-- statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
  await sql.transaction(
    [
      ...statements.map((statement) => sql.query(statement)),
      sql`
        INSERT INTO schema_migrations (version, checksum)
        VALUES (${file}, ${checksum})
      `,
    ],
    { isolationLevel: "Serializable" },
  );
}

console.log(`Applied ${migrationFiles.length} versioned migration(s) for ${config.role}.`);
