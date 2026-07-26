import { useEffect, useRef, useState } from "react";

import ProductCard from "./components/ProductCard.jsx";
import { sortByLowestPrice } from "./utils/products.js";

const CATEGORIES = ["Maquillaje", "Pelo", "Skincare"];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function App() {
  const [backendStatus, setBackendStatus] = useState("checking");
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [viewState, setViewState] = useState("initial");
  const searchRun = useRef(0);

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

  async function runSearch(searchTerm) {
    const cleanQuery = searchTerm.trim();
    if (!cleanQuery) return;

    const currentRun = ++searchRun.current;
    setQuery(cleanQuery);
    setSearchedQuery(cleanQuery);
    setViewState("loading");

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(cleanQuery)}`);
      if (!response.ok) throw new Error(`Search failed with HTTP ${response.status}`);

      const data = await response.json();
      if (!Array.isArray(data.results)) throw new Error("Invalid search response");

      const results = data.results;
      if (currentRun !== searchRun.current) return;
      setProducts(sortByLowestPrice(results));
      setViewState(results.length ? "results" : "empty");
    } catch {
      if (currentRun === searchRun.current) setViewState("error");
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    runSearch(query);
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
        <a className="brand" href="/" aria-label="Girlie Girl Price Central, inicio">
          <img src="/favicon-32x32.png" alt="" width="32" height="32" />
          <span>
            <strong>Girlie Girl</strong>
            <small>Price Central</small>
          </span>
        </a>
        <span
          className={`connection connection--${backendStatus}`}
          title={statusLabel}
          aria-label={statusLabel}
        />
      </header>

      <main>
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
                  <span>{products.length} productos encontrados</span>
                </div>
                <label>
                  <span>Ordenar</span>
                  <select aria-label="Ordenar resultados" defaultValue="lowest">
                    <option value="lowest">Menor precio</option>
                  </select>
                </label>
              </div>
              <div className="product-grid">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
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
      </main>

      <footer>
        <p>Powered by tu gordito 💗</p>
        <span>Girlie Girl Price Central</span>
      </footer>
    </div>
  );
}

export default App;
