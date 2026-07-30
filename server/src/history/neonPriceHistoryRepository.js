import { neon } from "@neondatabase/serverless";

const MAX_HISTORY_LIMIT = 50;

function createSnapshotQuery(sql, { product, snapshot }) {
  return sql`
    WITH product_row AS (
      INSERT INTO products (product_key, brand, name)
      VALUES (${product.productKey}, ${product.brand}, ${product.name})
      ON CONFLICT (product_key) DO UPDATE
      SET brand = EXCLUDED.brand,
          name = EXCLUDED.name,
          updated_at = NOW()
      RETURNING product_key
    ),
    offer_row AS (
      INSERT INTO product_offers (
        product_key,
        store,
        offer_id,
        product_url,
        last_seen_at
      )
      SELECT
        product_key,
        ${snapshot.store},
        ${snapshot.offerId},
        ${snapshot.productUrl},
        ${snapshot.timestamp}
      FROM product_row
      ON CONFLICT (store, offer_id) DO UPDATE
      SET product_url = EXCLUDED.product_url,
          last_seen_at = EXCLUDED.last_seen_at
      RETURNING product_key
    ),
    state_change AS (
      INSERT INTO price_current_state (
        product_key,
        store,
        current_price,
        previous_price,
        discount_percentage,
        in_stock,
        observed_at
      )
      SELECT
        product_key,
        ${snapshot.store},
        ${snapshot.currentPrice},
        ${snapshot.previousPrice},
        ${snapshot.discountPercentage},
        ${snapshot.inStock},
        ${snapshot.timestamp}
      FROM offer_row
      ON CONFLICT (product_key, store) DO UPDATE
      SET current_price = EXCLUDED.current_price,
          previous_price = EXCLUDED.previous_price,
          discount_percentage = EXCLUDED.discount_percentage,
          in_stock = EXCLUDED.in_stock,
          observed_at = EXCLUDED.observed_at
      WHERE (
        price_current_state.current_price,
        price_current_state.previous_price,
        price_current_state.discount_percentage,
        price_current_state.in_stock
      ) IS DISTINCT FROM (
        EXCLUDED.current_price,
        EXCLUDED.previous_price,
        EXCLUDED.discount_percentage,
        EXCLUDED.in_stock
      )
      RETURNING *
    ),
    inserted AS (
      INSERT INTO price_snapshots (
        product_key,
        store,
        observed_at,
        current_price,
        previous_price,
        discount_percentage,
        in_stock
      )
      SELECT
        product_key,
        store,
        observed_at,
        current_price,
        previous_price,
        discount_percentage,
        in_stock
      FROM state_change
      RETURNING id
    )
    SELECT EXISTS (SELECT 1 FROM inserted) AS inserted
  `;
}

export function createNeonPriceHistoryRepository(connectionString) {
  const sql = neon(connectionString);

  return {
    async recordSnapshot({ product, snapshot }) {
      const rows = await createSnapshotQuery(sql, { product, snapshot });

      return rows[0]?.inserted === true;
    },

    async recordSnapshots(entries) {
      if (!entries.length) return 0;
      const orderedEntries = [...entries].sort(
        (left, right) =>
          left.product.productKey.localeCompare(right.product.productKey) ||
          left.snapshot.store.localeCompare(right.snapshot.store) ||
          left.snapshot.offerId.localeCompare(right.snapshot.offerId),
      );
      const results = await sql.transaction(
        orderedEntries.map((entry) => createSnapshotQuery(sql, entry)),
        { isolationLevel: "ReadCommitted" },
      );
      return results.filter((rows) => rows[0]?.inserted === true).length;
    },

    async listSnapshots(productKey, store, requestedLimit = 20) {
      const limit = Math.min(Math.max(Number(requestedLimit) || 20, 1), MAX_HISTORY_LIMIT);
      const rows = await sql`
        SELECT
          observed_at AS timestamp,
          current_price AS "currentPrice",
          previous_price AS "previousPrice",
          discount_percentage AS "discountPercentage",
          in_stock AS "inStock"
        FROM price_snapshots
        WHERE product_key = ${productKey}
          AND store = ${store}
        ORDER BY observed_at DESC, id DESC
        LIMIT ${limit}
      `;

      return rows.map((row) => ({
        timestamp: new Date(row.timestamp).toISOString(),
        currentPrice: Number(row.currentPrice),
        previousPrice:
          row.previousPrice === null ? null : Number(row.previousPrice),
        discountPercentage:
          row.discountPercentage === null
            ? null
            : Number(row.discountPercentage),
        inStock: Boolean(row.inStock),
      }));
    },
  };
}
