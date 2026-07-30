function formatPrice(value) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

const TREND_LABELS = {
  down: "↓ Bajó",
  up: "↑ Subió",
  equal: "→ Igual",
};

function PriceHistorySummary({ summary, compact = false }) {
  if (!summary || summary.latestPrice === null) {
    return compact ? null : (
      <p className="history-empty">Todavía no hay suficiente historial.</p>
    );
  }

  if (compact) {
    return (
      <p className={`history-trend history-trend--${summary.trend ?? "new"}`}>
        {summary.trend ? TREND_LABELS[summary.trend] : "Primer precio registrado"}
        {summary.change !== null && summary.change !== 0 && (
          <span>{formatPrice(Math.abs(summary.change))}</span>
        )}
      </p>
    );
  }

  return (
    <div className="history-summary">
      <dl>
        <div>
          <dt>Último precio</dt>
          <dd>{formatPrice(summary.latestPrice)}</dd>
        </div>
        <div>
          <dt>Cambio</dt>
          <dd className={`history-trend--${summary.trend ?? "new"}`}>
            {summary.trend ? TREND_LABELS[summary.trend] : "Primer registro"}
            {summary.change !== null && summary.change !== 0 &&
              ` ${formatPrice(Math.abs(summary.change))}`}
          </dd>
        </div>
        <div>
          <dt>Mínimo</dt>
          <dd>{formatPrice(summary.minimum)}</dd>
        </div>
        <div>
          <dt>Máximo</dt>
          <dd>{formatPrice(summary.maximum)}</dd>
        </div>
        <div>
          <dt>Promedio</dt>
          <dd>{formatPrice(summary.average)}</dd>
        </div>
      </dl>
      {summary.goodPrice && <span className="good-price">Buen precio</span>}
    </div>
  );
}

export default PriceHistorySummary;
