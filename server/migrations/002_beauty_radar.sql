CREATE INDEX IF NOT EXISTS product_offers_offer_product_store_idx
  ON product_offers (offer_id, product_key, store);
