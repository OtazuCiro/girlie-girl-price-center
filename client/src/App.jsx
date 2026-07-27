import { useEffect, useRef, useState } from "react";

import ComparisonCard from "./components/ComparisonCard.jsx";
import {
  favoriteFromGroup,
  favoritesStorage,
} from "./favorites/favoritesStorage.js";
import { refreshFavorites } from "./favorites/refreshFavorites.js";
import { shareGirlieGirl } from "./utils/shareGirlieGirl.js";

const CATEGORIES = ["Maquillaje", "Pelo", "Skincare"];

function displayGroups(data) {
  if (!Array.isArray(data.families)) return data.groups;

  return data.families.map((family) => ({
    ...family.primary,
    productFamilyKey: family.productFamilyKey,
    relatedProducts: {
      variants: family.variants,
      packs: family.packs,
      sets: family.sets,
    },
    bestValueProductKey: family.bestValueProductKey,
  }));
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" />
    </svg>
  );
}

function App() {
  const [backendStatus, setBackendStatus] = useState("checking");
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [groups, setGroups] = useState([]);
  const [sources, setSources] = useState([]);
  const [viewState, setViewState] = useState("initial");
  const [activeView, setActiveView] = useState("search");
  const [favorites, setFavorites] = useState(() => favoritesStorage.getAll());
  const [favoriteUpdates, setFavoriteUpdates] = useState({});
  const [shareFeedback, setShareFeedback] = useState("");
  const searchRun = useRef(0);
  const shareFeedbackTimeout = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function checkBackend() {
      try {
        const response = await fetch("/api/health", { signal: controller.signal });
        const data = await response.json();
        setBackendStatus(
          response.ok && data.status === "ok" ? "connected" : "unavailable",
        );
      } catch (error) {
        if (error.name !== "AbortError") setBackendStatus("unavailable");
      }
    }

    checkBackend();
    return () => controller.abort();
  }, []);

  useEffect(
    () => () => {
      if (shareFeedbackTimeout.current) {
        clearTimeout(shareFeedbackTimeout.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (activeView !== "favorites" || !favorites.length) return undefined;

    const controller = new AbortController();
    const favoritesToRefresh = favorites;
    setFavoriteUpdates({});

    refreshFavorites(favoritesToRefresh, { signal: controller.signal })
      .then((updates) => {
        if (controller.signal.aborted) return;
        setFavoriteUpdates(
          Object.fromEntries(
            updates.map(({ productKey, group }) => [productKey, group]),
          ),
        );
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          setFavoriteUpdates(
            Object.fromEntries(
              favoritesToRefresh.map((favorite) => [favorite.productKey, null]),
            ),
          );
        }
      });

    return () => controller.abort();
  }, [activeView]);

  async function runSearch(searchTerm) {
    const cleanQuery = searchTerm.trim();
    if (!cleanQuery) return;

    const currentRun = ++searchRun.current;
    setQuery(cleanQuery);
    setSearchedQuery(cleanQuery);
    setActiveView("search");
    setViewState("loading");

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(cleanQuery)}`);
      if (!response.ok) throw new Error(`Search failed with HTTP ${response.status}`);

      const data = await response.json();
      if (!Array.isArray(data.results) || !Array.isArray(data.groups)) {
        throw new Error("Invalid search response");
      }

      if (currentRun !== searchRun.current) return;
      const nextGroups = displayGroups(data);
      setGroups(nextGroups);
      setSources(Array.isArray(data.sources) ? data.sources : []);
      setViewState(nextGroups.length ? "results" : "empty");
    } catch {
      if (currentRun === searchRun.current) setViewState("error");
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    runSearch(query);
  }

  function toggleFavorite(group, storedProductKey = group.productKey) {
    const isStored = favorites.some(
      (favorite) => favorite.productKey === storedProductKey,
    );

    setFavorites(
      isStored
        ? favoritesStorage.remove(storedProductKey)
        : favoritesStorage.add(favoriteFromGroup(group)),
    );
  }

  function showSearch() {
    setActiveView("search");
  }

  async function handleShare() {
    const result = await shareGirlieGirl();
    if (result === "shared" || result === "cancelled") return;

    setShareFeedback(
      result === "copied" ? "Link copiado 💗" : "No pudimos compartir ahora",
    );
    if (shareFeedbackTimeout.current) {
      clearTimeout(shareFeedbackTimeout.current);
    }
    shareFeedbackTimeout.current = setTimeout(() => setShareFeedback(""), 2500);
  }

  const statusLabel =
    backendStatus === "connected"
      ? "Servicio conectado"
      : backendStatus === "unavailable"
        ? "Servicio sin conexión"
        : "Comprobando servicio";

  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          className="brand"
          href="/"
          aria-label="Girlie Girl Price Central, inicio"
          onClick={(event) => {
            event.preventDefault();
            showSearch();
          }}
        >
          <img src="/favicon-32x32.png" alt="" width="32" height="32" />
          <span>
            <strong>Girlie Girl</strong>
            <small>Price Central</small>
          </span>
        </a>
        <div className="header-actions">
          <button
            className="share-button"
            type="button"
            aria-label="Compartir Girlie Girl"
            title="Compartir Girlie Girl"
            onClick={handleShare}
          >
            <ShareIcon />
          </button>
          <button
            className={`favorites-link ${activeView === "favorites" ? "favorites-link--active" : ""}`}
            type="button"
            onClick={() => setActiveView("favorites")}
          >
            <span aria-hidden="true">♡</span>
            Favoritos
            {favorites.length > 0 && <small>{favorites.length}</small>}
          </button>
          <span
            className={`connection connection--${backendStatus}`}
            title={statusLabel}
            aria-label={statusLabel}
          />
          {shareFeedback && (
            <span className="share-feedback" role="status">
              {shareFeedback}
            </span>
          )}
        </div>
      </header>

      <main>
        {activeView === "search" && (
          <>
          <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">Belleza a tu precio</p>
          <h1 id="hero-title">
            Encontrá eso que te encanta, <em>al mejor precio.</em>
          </h1>
          <p className="tagline">
            Que complementes tu preciosura con los mejores precios.
          </p>

          <form className="search" role="search" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="product-search">
              Buscar productos
            </label>
            <input
              id="product-search"
              type="search"
              placeholder="¿Qué estamos buscando hoy?"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit" aria-label="Buscar">
              <SearchIcon />
            </button>
          </form>

          <nav className="categories" aria-label="Categorías">
            {CATEGORIES.map((category) => (
              <button key={category} type="button" onClick={() => runSearch(category)}>
                {category}
              </button>
            ))}
          </nav>
          </section>

          <section className="results" aria-live="polite" aria-busy={viewState === "loading"}>
          {viewState === "initial" && (
            <div className="welcome-state">
              <span aria-hidden="true">⌁</span>
              <p>Buscá un producto o explorá una categoría para empezar.</p>
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
                    onToggleFavorite={() => toggleFavorite(group)}
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
          </>
        )}

        {activeView === "favorites" && (
          <section className="favorites-view" aria-labelledby="favorites-title">
            <div className="favorites-heading">
              <p className="eyebrow">Guardados</p>
              <h1 id="favorites-title">Mis favoritos</h1>
            </div>

            {!favorites.length ? (
              <div className="message-state">
                <h2>Todavía no guardaste ningún producto.</h2>
                <button className="secondary-action" type="button" onClick={showSearch}>
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
                        toggleFavorite(updatedGroup ?? fallbackGroup, favorite.productKey)
                      }
                      availabilityMessage={
                        updatedGroup
                          ? undefined
                          : hasUpdate
                            ? "Sin ofertas disponibles en este momento"
                            : "Actualizando ofertas…"
                      }
                    />
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      <footer>
        <p>For Cami, now for the girlies 💗</p>
        <span>Girlie Girl Price Central</span>
      </footer>
    </div>
  );
}

export default App;
