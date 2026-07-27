import { describe, expect, it, vi } from "vitest";

import { refreshFavorites } from "./refreshFavorites.js";

function favorite(productKey, offerId) {
  return {
    productKey,
    searchQuery: productKey,
    offerIds: [offerId],
  };
}

function group(productKey, offerId) {
  return {
    productKey,
    offers: [{ id: offerId }],
  };
}

describe("refreshFavorites", () => {
  it("matches refreshed groups by stable key or known offer membership", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ groups: [group("product-a", "offer-a")] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ groups: [group("changed-key", "offer-b")] }),
      });

    const results = await refreshFavorites(
      [favorite("product-a", "offer-a"), favorite("product-b", "offer-b")],
      { fetchImpl, concurrency: 1 },
    );

    expect(results[0].group.productKey).toBe("product-a");
    expect(results[1].group.productKey).toBe("changed-key");
  });

  it("keeps individual failures unavailable without rejecting the batch", async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ groups: [group("product-b", "offer-b")] }),
      });

    const results = await refreshFavorites(
      [favorite("product-a", "offer-a"), favorite("product-b", "offer-b")],
      { fetchImpl, concurrency: 1 },
    );

    expect(results).toEqual([
      { productKey: "product-a", group: null },
      { productKey: "product-b", group: group("product-b", "offer-b") },
    ]);
  });

  it("limits concurrent refresh requests", async () => {
    let active = 0;
    let maximum = 0;
    const fetchImpl = vi.fn(async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      active -= 1;
      return { ok: true, json: async () => ({ groups: [] }) };
    });

    await refreshFavorites(
      Array.from({ length: 8 }, (_, index) =>
        favorite(`product-${index}`, `offer-${index}`),
      ),
      { fetchImpl, concurrency: 3 },
    );

    expect(maximum).toBeLessThanOrEqual(3);
  });

});
