function formatPrice(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function trendSymbol(trend) {
  if (trend === "down") return "↓";
  if (trend === "up") return "↑";
  return "→";
}

function RadarItems({ items, showTrend = false }) {
  return (
    <ul className="radar-list">
      {items.map((item) => (
        <li key={`${item.productKey}-${item.store}`}>
          <div>
            <strong>{item.name}</strong>
            <span>{item.store}</span>
          </div>
          <div className="radar-price">
            <strong>{formatPrice(item.currentPrice)}</strong>
            <span className={`radar-change radar-change--${item.trend}`}>
              {showTrend && <b aria-hidden="true">{trendSymbol(item.trend)}</b>}
              {item.difference > 0 ? "+" : ""}
              {formatPrice(item.difference)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function RadarSection({ title, items, emptyMessage, showTrend = false }) {
  return (
    <section className="radar-section">
      <h3>{title}</h3>
      {items.length ? (
        <RadarItems items={items} showTrend={showTrend} />
      ) : (
        <p>{emptyMessage}</p>
      )}
    </section>
  );
}

function BeautyRadar({ state, hasFavorites }) {
  const radar = state.data ?? {
    recentDrops: [],
    newHistoricalLows: [],
    favoriteChanges: [],
  };

  return (
    <section className="beauty-radar" aria-labelledby="beauty-radar-title">
      <div className="radar-heading">
        <p className="eyebrow">Precios en movimiento</p>
        <h2 id="beauty-radar-title">✨ Beauty Radar</h2>
      </div>

      {state.status === "loading" ? (
        <p className="radar-loading" role="status">
          Mirando los últimos precios…
        </p>
      ) : (
        <div className="radar-grid">
          <RadarSection
            title="Bajaron recientemente"
            items={radar.recentDrops}
            emptyMessage="No hubo cambios recientes."
          />
          <RadarSection
            title="Nuevos mínimos históricos"
            items={radar.newHistoricalLows}
            emptyMessage="Aún estamos construyendo el historial."
          />
          <RadarSection
            title="Cambios en Favoritos"
            items={radar.favoriteChanges}
            emptyMessage={
              hasFavorites
                ? "Tus favoritos no cambiaron de precio."
                : "Guardá favoritos para seguir sus cambios."
            }
            showTrend
          />
        </div>
      )}
    </section>
  );
}

export default BeautyRadar;
