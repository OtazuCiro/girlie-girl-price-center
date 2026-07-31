import { useEffect, useRef, useState } from "react";

import BottomNavigation from "./components/BottomNavigation.jsx";
import { favoriteFromGroup, favoritesStorage } from "./favorites/favoritesStorage.js";
import { refreshFavorites } from "./favorites/refreshFavorites.js";
import FavoritesPage from "./pages/FavoritesPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import RadarPage from "./pages/RadarPage.jsx";
import SearchPage from "./pages/SearchPage.jsx";
import { shareGirlieGirl } from "./utils/shareGirlieGirl.js";

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
  const [activeTab, setActiveTab] = useState("home");
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [groups, setGroups] = useState([]);
  const [sources, setSources] = useState([]);
  const [viewState, setViewState] = useState("initial");
  const [favorites, setFavorites] = useState(() => favoritesStorage.getAll());
  const [favoriteUpdates, setFavoriteUpdates] = useState({});
  const [shareFeedback, setShareFeedback] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [radarState, setRadarState] = useState({ status: "loading", data: null });
  const searchRun = useRef(0);
  const shareFeedbackTimeout = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        setBackendStatus(
          response.ok && data.status === "ok" ? "connected" : "unavailable",
        );
      })
      .catch((error) => {
        if (error.name !== "AbortError") setBackendStatus("unavailable");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const parameters = new URLSearchParams();
    const offerIds = [
      ...new Set(favorites.flatMap((favorite) => favorite.offerIds ?? [])),
    ].slice(0, 40);
    const productKeys = favorites.map((favorite) => favorite.productKey).slice(0, 40);
    if (offerIds.length) parameters.set("favoriteOfferIds", offerIds.join(","));
    if (productKeys.length) {
      parameters.set("favoriteProductKeys", productKeys.join(","));
    }
    const queryString = parameters.toString();
    setRadarState((current) => ({ status: "loading", data: current.data }));

    fetch(`/api/beauty-radar${queryString ? `?${queryString}` : ""}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Beauty Radar unavailable");
        const data = await response.json();
        if (
          !Array.isArray(data.recentDrops) ||
          !Array.isArray(data.newHistoricalLows) ||
          !Array.isArray(data.favoriteChanges)
        ) {
          throw new Error("Invalid Beauty Radar response");
        }
        setRadarState({ status: "ready", data });
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setRadarState({
            status: "ready",
            data: {
              recentDrops: [],
              newHistoricalLows: [],
              favoriteChanges: [],
            },
          });
        }
      });
    return () => controller.abort();
  }, [favorites]);

  useEffect(() => {
    if (activeTab !== "favorites" || !favorites.length) return undefined;
    const controller = new AbortController();
    const favoritesToRefresh = favorites;
    setFavoriteUpdates({});
    refreshFavorites(favoritesToRefresh, { signal: controller.signal })
      .then((updates) => {
        if (!controller.signal.aborted) {
          setFavoriteUpdates(
            Object.fromEntries(
              updates.map(({ productKey, group }) => [productKey, group]),
            ),
          );
        }
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
  }, [activeTab]);

  useEffect(
    () => () => {
      if (shareFeedbackTimeout.current) clearTimeout(shareFeedbackTimeout.current);
    },
    [],
  );

  async function runSearch(searchTerm) {
    const cleanQuery = searchTerm.trim();
    if (!cleanQuery) return;
    const currentRun = ++searchRun.current;
    setQuery(cleanQuery);
    setSearchedQuery(cleanQuery);
    setSelectedGroup(null);
    setActiveTab("search");
    setViewState("loading");
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(cleanQuery)}`);
      if (!response.ok) throw new Error(`Search failed with HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.results) || !Array.isArray(data.groups)) {
        throw new Error("Invalid search response");
      }
      if (currentRun !== searchRun.current) return;
      setGroups(data.groups);
      setSources(Array.isArray(data.sources) ? data.sources : []);
      setViewState(data.groups.length ? "results" : "empty");
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

  function navigate(tab) {
    setActiveTab(tab);
    if (tab !== "search") setSelectedGroup(null);
  }

  function showDetail(group) {
    setSelectedGroup(group);
    setActiveTab("search");
  }

  async function handleShare() {
    const result = await shareGirlieGirl();
    if (result === "shared" || result === "cancelled") return;
    setShareFeedback(
      result === "copied" ? "Link copiado 💗" : "No pudimos compartir ahora",
    );
    if (shareFeedbackTimeout.current) clearTimeout(shareFeedbackTimeout.current);
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
            navigate("home");
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

      <main className="app-main">
        {activeTab === "home" && (
          <HomePage
            query={query}
            onQueryChange={setQuery}
            onSubmit={handleSubmit}
            onCategory={runSearch}
            onOpenRadar={() => navigate("radar")}
            radarState={radarState}
            recentFavorites={favorites.slice(0, 2)}
            onOpenFavorites={() => navigate("favorites")}
          />
        )}
        {activeTab === "search" && (
          <SearchPage
            query={query}
            onQueryChange={setQuery}
            onSubmit={handleSubmit}
            searchedQuery={searchedQuery}
            groups={groups}
            sources={sources}
            viewState={viewState}
            favorites={favorites}
            selectedGroup={selectedGroup}
            onToggleFavorite={toggleFavorite}
            onViewDetails={showDetail}
            onBackFromDetail={() => setSelectedGroup(null)}
          />
        )}
        {activeTab === "radar" && (
          <RadarPage radarState={radarState} hasFavorites={favorites.length > 0} />
        )}
        {activeTab === "favorites" && (
          <FavoritesPage
            favorites={favorites}
            favoriteUpdates={favoriteUpdates}
            onToggleFavorite={toggleFavorite}
            onViewDetails={showDetail}
            onSearch={() => navigate("search")}
          />
        )}
      </main>

      <footer>
        <p>For Cami, now for the girlies 💗</p>
        <span>Girlie Girl Price Central</span>
      </footer>
      <BottomNavigation
        activeTab={activeTab}
        favoriteCount={favorites.length}
        onNavigate={navigate}
      />
    </div>
  );
}

export default App;
