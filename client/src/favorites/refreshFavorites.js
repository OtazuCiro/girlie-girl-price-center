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
        let refreshedGroup = group;

        if (group) {
          const offer =
            group.offers.find(
              (candidate) => candidate.id === group.bestPriceOfferId,
            ) ??
            group.offers.find((candidate) => candidate.inStock) ??
            group.offers[0];

          if (offer?.store) {
            try {
              const historyResponse = await fetchImpl(
                `/api/history/${encodeURIComponent(offer.historyProductKey ?? group.productKey)}?store=${encodeURIComponent(offer.store)}&limit=20`,
                { signal },
              );
              if (historyResponse.ok) {
                const history = await historyResponse.json();
                refreshedGroup = {
                  ...group,
                  historySummary: history.summary,
                };
              }
            } catch (error) {
              if (error?.name === "AbortError") throw error;
            }
          }
        }

        results[index] = {
          productKey: favorite.productKey,
          group: refreshedGroup ?? null,
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
