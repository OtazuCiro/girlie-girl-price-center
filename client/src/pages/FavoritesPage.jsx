import ComparisonCard from "../components/ComparisonCard.jsx";

function FavoritesPage({
  favorites,
  favoriteUpdates,
  onToggleFavorite,
  onViewDetails,
  onSearch,
}) {
  return (
    <div className="page page--favorites" data-page="favorites">
      <section className="favorites-view" aria-labelledby="favorites-title">
        <div className="favorites-heading">
          <p className="eyebrow">Guardados</p>
          <h1 id="favorites-title">Mis favoritos</h1>
        </div>
        {!favorites.length ? (
          <div className="message-state">
            <h2>Todavía no guardaste ningún producto.</h2>
            <button className="secondary-action" type="button" onClick={onSearch}>
              Buscar productos
            </button>
          </div>
        ) : (
          <div className="product-grid">
            {favorites.map((favorite) => {
              const hasUpdate = Object.hasOwn(favoriteUpdates, favorite.productKey);
              const updatedGroup = favoriteUpdates[favorite.productKey];
              const fallbackGroup = {
                id: favorite.productKey,
                productKey: favorite.productKey,
                brand: favorite.brand,
                name: favorite.name,
                imageUrl: favorite.imageUrl,
                offers: [],
                bestPriceOfferId: null,
                lowestPrice: null,
                savings: null,
                inStock: true,
              };
              return (
                <ComparisonCard
                  key={favorite.productKey}
                  group={updatedGroup ?? fallbackGroup}
                  isFavorite
                  onToggleFavorite={() =>
                    onToggleFavorite(updatedGroup ?? fallbackGroup, favorite.productKey)
                  }
                  availabilityMessage={
                    updatedGroup
                      ? undefined
                      : hasUpdate
                        ? "Sin ofertas disponibles en este momento"
                        : "Actualizando ofertas…"
                  }
                  historySummary={updatedGroup?.historySummary}
                  onViewDetails={
                    updatedGroup ? () => onViewDetails(updatedGroup) : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default FavoritesPage;
