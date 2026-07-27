function matchesFavorite(group, favorite) {
  return (
    group.productKey === favorite.productKey ||
    group.offers.some((offer) => favorite.offerIds.includes(offer.id))
  );
}

function withFamily(group, families) {
  const family = families.find((candidate) =>
    [
      candidate.primary,
      ...candidate.variants,
      ...candidate.packs,
      ...candidate.sets,
    ].some((member) => member.productKey === group.productKey),
  );
  if (!family) return group;

  return {
    ...group,
    productFamilyKey: family.productFamilyKey,
    relatedProducts: {
      variants: family.variants.filter(
        (member) => member.productKey !== group.productKey,
      ),
      packs: family.packs.filter(
        (member) => member.productKey !== group.productKey,
      ),
      sets: family.sets.filter(
        (member) => member.productKey !== group.productKey,
      ),
    },
    bestValueProductKey: family.bestValueProductKey,
  };
}

export async function refreshFavorites(
  favorites,
  { fetchImpl = globalThis.fetch, signal, concurrency = 3 } = {},
) {
  const results = new Array(favorites.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < favorites.length) {
      const index = nextIndex;
      nextIndex += 1;
      const favorite = favorites[index];

      try {
        const response = await fetchImpl(
          `/api/search?q=${encodeURIComponent(favorite.searchQuery)}`,
          { signal },
        );
        if (!response.ok) throw new Error(`Search failed with HTTP ${response.status}`);
        const data = await response.json();
        const group = Array.isArray(data.groups)
          ? data.groups.find((candidate) => matchesFavorite(candidate, favorite))
          : null;
        const refreshed =
          group && Array.isArray(data.families)
            ? withFamily(group, data.families)
            : group;
        results[index] = {
          productKey: favorite.productKey,
          group: refreshed ?? null,
        };
      } catch (error) {
        if (error?.name === "AbortError") throw error;
        results[index] = { productKey: favorite.productKey, group: null };
      }
    }
  }

  const workerCount = Math.min(concurrency, favorites.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
