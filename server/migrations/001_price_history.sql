CREATE TABLE IF NOT EXISTS products (
  product_key TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS product_offers (
  id BIGSERIAL PRIMARY KEY,
  product_key TEXT NOT NULL REFERENCES products(product_key),
  store TEXT NOT NULL,
  offer_id TEXT NOT NULL,
  product_url TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_offers_store_offer_unique UNIQUE (store, offer_id)
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS product_offers_product_store_idx
  ON product_offers (product_key, store);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS price_current_state (
  product_key TEXT NOT NULL REFERENCES products(product_key),
  store TEXT NOT NULL,
  current_price NUMERIC(14, 2) NOT NULL CHECK (current_price >= 0),
  previous_price NUMERIC(14, 2) CHECK (previous_price >= 0),
  discount_percentage NUMERIC(5, 2)
    CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  in_stock BOOLEAN NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (product_key, store)
);
-- statement-breakpoint
CREATE TABLE IF NOT EXISTS price_snapshots (
  id BIGSERIAL PRIMARY KEY,
  product_key TEXT NOT NULL REFERENCES products(product_key),
  store TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  current_price NUMERIC(14, 2) NOT NULL CHECK (current_price >= 0),
  previous_price NUMERIC(14, 2) CHECK (previous_price >= 0),
  discount_percentage NUMERIC(5, 2)
    CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  in_stock BOOLEAN NOT NULL
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS price_snapshots_product_store_time_idx
  ON price_snapshots (product_key, store, observed_at DESC, id DESC);
