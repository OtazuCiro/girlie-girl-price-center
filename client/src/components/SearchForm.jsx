function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function SearchForm({ compact = false, query, onQueryChange, onSubmit }) {
  return (
    <form
      className={`search ${compact ? "search--compact" : ""}`}
      role="search"
      onSubmit={onSubmit}
    >
      <label className="sr-only" htmlFor={compact ? "search-page-input" : "home-search-input"}>
        Buscar productos
      </label>
      <input
        id={compact ? "search-page-input" : "home-search-input"}
        type="search"
        placeholder="¿Qué estamos buscando hoy?"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <button type="submit" aria-label="Buscar">
        <SearchIcon />
      </button>
    </form>
  );
}

export default SearchForm;
