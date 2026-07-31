import { neon } from "@neondatabase/serverless";

const MAX_HISTORY_LIMIT = 50;
const MAX_RADAR_LIMIT = 10;

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

    async getBeautyRadar({
      favoriteOfferIds = [],
      favoriteProductKeys = [],
      limit: requestedLimit = MAX_RADAR_LIMIT,
    } = {}) {
      const limit = Math.min(
        Math.max(Number(requestedLimit) || MAX_RADAR_LIMIT, 1),
        MAX_RADAR_LIMIT,
      );
      const favoriteOfferIdsJson = JSON.stringify(favoriteOfferIds);
      const favoriteProductKeysJson = JSON.stringify(favoriteProductKeys);
      const rows = await sql`
        WITH ranked_snapshots AS (
          SELECT
            snapshots.product_key,
            snapshots.store,
            snapshots.observed_at,
            snapshots.current_price,
            snapshots.in_stock,
            products.brand,
            products.name,
            ROW_NUMBER() OVER (
              PARTITION BY snapshots.product_key, snapshots.store
              ORDER BY snapshots.observed_at DESC, snapshots.id DESC
            ) AS snapshot_rank,
            LEAD(snapshots.current_price) OVER (
              PARTITION BY snapshots.product_key, snapshots.store
              ORDER BY snapshots.observed_at DESC, snapshots.id DESC
            ) AS previous_price,
            MIN(snapshots.current_price) OVER (
              PARTITION BY snapshots.product_key, snapshots.store
              ORDER BY snapshots.observed_at DESC, snapshots.id DESC
              ROWS BETWEEN 1 FOLLOWING AND UNBOUNDED FOLLOWING
            ) AS prior_minimum
          FROM price_snapshots AS snapshots
          JOIN products
            ON products.product_key = snapshots.product_key
        ),
        history_stats AS (
          SELECT
            product_key,
            store,
            COUNT(*) AS snapshot_count,
            COUNT(DISTINCT observed_at::date) AS observed_days,
            MAX(observed_at) - MIN(observed_at) AS history_span
          FROM price_snapshots
          GROUP BY product_key, store
        ),
        latest_offers AS (
          SELECT DISTINCT ON (product_key, store)
            product_key,
            store,
            offer_id
          FROM product_offers
          ORDER BY product_key, store, last_seen_at DESC, id DESC
        ),
        latest AS (
          SELECT
            ranked.product_key,
            ranked.store,
            offers.offer_id,
            ranked.brand,
            ranked.name,
            ranked.observed_at,
            ranked.current_price,
            ranked.previous_price,
            ranked.current_price - ranked.previous_price AS difference,
            ranked.prior_minimum,
            stats.snapshot_count,
            stats.observed_days,
            stats.history_span,
            ROW_NUMBER() OVER (
              PARTITION BY ranked.brand, ranked.name
              ORDER BY ranked.current_price ASC, ranked.store ASC
            ) AS best_store_rank
          FROM ranked_snapshots AS ranked
          JOIN history_stats AS stats
            USING (product_key, store)
          LEFT JOIN latest_offers AS offers
            USING (product_key, store)
          WHERE ranked.snapshot_rank = 1
            AND ranked.in_stock = TRUE
            AND ranked.observed_at >= NOW() - INTERVAL '14 days'
        ),
        favorite_offer_ids AS (
          SELECT jsonb_array_elements_text(
            ${favoriteOfferIdsJson}::jsonb
          ) AS value
        ),
        favorite_product_keys AS (
          SELECT jsonb_array_elements_text(
            ${favoriteProductKeysJson}::jsonb
          ) AS value
        ),
        recent_drops AS (
          SELECT *
          FROM latest
          WHERE previous_price IS NOT NULL
            AND difference < 0
            AND best_store_rank = 1
          ORDER BY ABS(difference) DESC, name ASC
          LIMIT ${limit}
        ),
        new_lows AS (
          SELECT *
          FROM latest
          WHERE prior_minimum IS NOT NULL
            AND current_price < prior_minimum
            AND snapshot_count >= 5
            AND observed_days >= 3
            AND history_span >= INTERVAL '7 days'
            AND best_store_rank = 1
          ORDER BY ABS(difference) DESC NULLS LAST, name ASC
          LIMIT ${limit}
        ),
        favorite_changes AS (
          SELECT *
          FROM latest
          WHERE previous_price IS NOT NULL
            AND (
              offer_id IN (SELECT value FROM favorite_offer_ids)
              OR product_key IN (SELECT value FROM favorite_product_keys)
            )
          ORDER BY ABS(difference) DESC, name ASC
          LIMIT 40
        )
        SELECT 'recentDrops' AS section, * FROM recent_drops
        UNION ALL
        SELECT 'newHistoricalLows' AS section, * FROM new_lows
        UNION ALL
        SELECT 'favoriteChanges' AS section, * FROM favorite_changes
      `;

      const radar = {
        recentDrops: [],
        newHistoricalLows: [],
        favoriteChanges: [],
      };
      for (const row of rows) {
        radar[row.section].push({
          productKey: row.product_key,
          offerId: row.offer_id,
          brand: row.brand,
          name: row.name,
          store: row.store,
          currentPrice: Number(row.current_price),
          previousPrice: Number(row.previous_price),
          difference: Number(row.difference),
          trend:
            Number(row.difference) < 0
              ? "down"
              : Number(row.difference) > 0
                ? "up"
                : "equal",
          snapshotCount: Number(row.snapshot_count),
          observedDays: Number(row.observed_days),
          observedAt: new Date(row.observed_at).toISOString(),
        });
      }

      return radar;
    },
  };
}
