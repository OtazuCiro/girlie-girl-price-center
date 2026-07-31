import SearchForm from "../components/SearchForm.jsx";

const CATEGORIES = ["Maquillaje", "Pelo", "Skincare"];

function radarHasNews(state) {
  const data = state.data;
  return Boolean(
    data?.recentDrops?.length ||
      data?.newHistoricalLows?.length ||
      data?.favoriteChanges?.length,
  );
}

function HomePage({
  query,
  onQueryChange,
  onSubmit,
  onCategory,
  onOpenRadar,
  radarState,
  recentFavorites,
  onOpenFavorites,
}) {
  return (
    <div className="page page--home" data-page="home">
      <section className="hero" aria-labelledby="home-title">
        <img className="home-logo" src="/icon-192.png" alt="" width="88" height="88" />
        <p className="eyebrow">Belleza a tu precio</p>
        <h1 id="home-title">
          Encontrá eso que te encanta, <em>al mejor precio.</em>
        </h1>
        <p className="tagline">
          Que complementes tu preciosura con los mejores precios.
        </p>
        <SearchForm
          query={query}
          onQueryChange={onQueryChange}
          onSubmit={onSubmit}
        />
        <nav className="categories" aria-label="Categorías">
          {CATEGORIES.map((category) => (
            <button key={category} type="button" onClick={() => onCategory(category)}>
              {category}
            </button>
          ))}
        </nav>
      </section>

      <section className="home-summary" aria-labelledby="home-radar-title">
        <div>
          <p className="eyebrow">Beauty Radar</p>
          <h2 id="home-radar-title">
            {radarState.status === "loading"
              ? "Mirando los últimos precios…"
              : radarHasNews(radarState)
                ? "Hoy encontramos novedades."
                : "Seguimos mirando los precios."}
          </h2>
        </div>
        <button type="button" onClick={onOpenRadar}>
          Ver Radar <span aria-hidden="true">→</span>
        </button>
      </section>

      {recentFavorites.length > 0 && (
        <section className="home-favorites" aria-labelledby="recent-favorites-title">
          <div>
            <p className="eyebrow">Tus guardados</p>
            <h2 id="recent-favorites-title">Favoritos recientes</h2>
            <p>{recentFavorites.map((favorite) => favorite.name).join(" · ")}</p>
          </div>
          <button type="button" onClick={onOpenFavorites}>
            Ver favoritos
          </button>
        </section>
      )}
    </div>
  );
}

export default HomePage;
