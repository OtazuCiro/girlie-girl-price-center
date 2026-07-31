const ITEMS = [
  { id: "home", icon: "⌂", label: "Inicio" },
  { id: "search", icon: "⌕", label: "Buscar" },
  { id: "radar", icon: "✦", label: "Radar" },
  { id: "favorites", icon: "♡", label: "Favoritos" },
];

function BottomNavigation({ activeTab, favoriteCount, onNavigate }) {
  return (
    <nav className="bottom-navigation" aria-label="Navegación principal">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          className={activeTab === item.id ? "bottom-navigation__item--active" : ""}
          type="button"
          aria-current={activeTab === item.id ? "page" : undefined}
          aria-label={item.id === "search" ? "Ir a Buscar" : item.label}
          onClick={() => onNavigate(item.id)}
        >
          <span aria-hidden="true">{item.icon}</span>
          <small>{item.label}</small>
          {item.id === "favorites" && favoriteCount > 0 && (
            <b aria-label={`${favoriteCount} favoritos`}>{favoriteCount}</b>
          )}
        </button>
      ))}
    </nav>
  );
}

export default BottomNavigation;
