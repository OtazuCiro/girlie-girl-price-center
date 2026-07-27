function matchesFavorite(group, favorite) {
  return (
    group.productKey === favorite.productKey ||
    group.offers.some((offer) => favorite.offerIds.includes(offer.id))
  );
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
        results[index] = { productKey: favorite.productKey, group: group ?? null };
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
