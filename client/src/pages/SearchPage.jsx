import ComparisonCard from "../components/ComparisonCard.jsx";
import ProductDetail from "../components/ProductDetail.jsx";
import SearchForm from "../components/SearchForm.jsx";

function SearchPage({
  query,
  onQueryChange,
  onSubmit,
  searchedQuery,
  groups,
  sources,
  viewState,
  favorites,
  selectedGroup,
  onToggleFavorite,
  onViewDetails,
  onBackFromDetail,
}) {
  if (selectedGroup) {
    return (
      <div className="page page--search" data-page="search">
        <ProductDetail group={selectedGroup} onBack={onBackFromDetail} />
      </div>
    );
  }

  return (
    <div className="page page--search" data-page="search">
      <header className="page-heading">
        <p className="eyebrow">Encontrar</p>
        <h1>Buscar productos</h1>
      </header>
      <SearchForm
        compact
        query={query}
        onQueryChange={onQueryChange}
        onSubmit={onSubmit}
      />
      <p className="search-history-placeholder">
        Tus búsquedas recientes aparecerán acá.
      </p>

      <section className="results" aria-live="polite" aria-busy={viewState === "loading"}>
        {viewState === "initial" && (
          <div className="welcome-state">
            <span aria-hidden="true">⌁</span>
            <p>Buscá por producto, marca o categoría.</p>
          </div>
        )}
        {viewState === "loading" && (
          <div className="loading-state" role="status">
            <span className="loader" aria-hidden="true" />
            <p>Buscando precios lindos…</p>
          </div>
        )}
        {viewState === "results" && (
          <>
            <div className="results-heading">
              <div>
                <p className="eyebrow">Resultados</p>
                <h2>Para “{searchedQuery}”</h2>
                <span>{groups.length} productos encontrados</span>
              </div>
              <label>
                <span>Ordenar</span>
                <select aria-label="Ordenar resultados" defaultValue="lowest">
                  <option value="lowest">Menor precio</option>
                </select>
              </label>
            </div>
            {sources.some((source) => source.status === "error") && (
              <p className="partial-results" role="status">
                Mostramos resultados parciales: alguna tienda no respondió.
              </p>
            )}
            <div className="product-grid">
              {groups.map((group) => (
                <ComparisonCard
                  key={group.id}
                  group={group}
                  isFavorite={favorites.some(
                    (favorite) => favorite.productKey === group.productKey,
                  )}
                  onToggleFavorite={() => onToggleFavorite(group)}
                  onViewDetails={() => onViewDetails(group)}
                />
              ))}
            </div>
          </>
        )}
        {viewState === "empty" && (
          <div className="message-state">
            <span aria-hidden="true">🎀</span>
            <h2>No encontramos nada por acá</h2>
            <p>Probá con otro producto, marca o categoría.</p>
          </div>
        )}
        {viewState === "error" && (
          <div className="message-state" role="alert">
            <h2>Algo no salió como esperábamos</h2>
            <p>Intentá nuevamente en unos minutos.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default SearchPage;
