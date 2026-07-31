import { useEffect, useState } from "react";

import { selectPrimaryOffer } from "../products/currentProduct.js";
import PriceHistorySummary from "./PriceHistorySummary.jsx";

function ProductDetail({ group, onBack }) {
  const [historyState, setHistoryState] = useState({
    status: "loading",
    history: null,
  });
  const offer = selectPrimaryOffer(group);

  useEffect(() => {
    if (!offer) {
      setHistoryState({ status: "empty", history: null });
      return undefined;
    }

    const controller = new AbortController();
    fetch(
      `/api/history/${encodeURIComponent(offer.historyProductKey ?? group.productKey)}?store=${encodeURIComponent(offer.store)}&limit=20`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(`History failed with HTTP ${response.status}`);
        return response.json();
      })
      .then((history) => {
        if (!controller.signal.aborted) {
          setHistoryState({ status: "ready", history });
        }
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          setHistoryState({ status: "unavailable", history: null });
        }
      });

    return () => controller.abort();
  }, [group.productKey, offer?.historyProductKey, offer?.store]);

  return (
    <section className="product-detail" aria-labelledby="product-detail-title">
      <button className="detail-back" type="button" onClick={onBack}>
        ← Volver
      </button>
      <div className="product-detail__header">
        <img src={group.imageUrl || "/icon-192.png"} alt="" width="160" height="160" />
        <div>
          <p className="comparison-card__brand">{group.brand}</p>
          <h1 id="product-detail-title">{group.displayName ?? group.name}</h1>
          {offer && <p>Historial en {offer.store}</p>}
        </div>
      </div>
      <section className="history-panel" aria-labelledby="history-title">
        <p className="eyebrow">Evolución</p>
        <h2 id="history-title">Historial de precios</h2>
        {historyState.status === "loading" && <p>Consultando historial…</p>}
        {historyState.status === "unavailable" && (
          <p>El historial no está disponible en este momento.</p>
        )}
        {historyState.status === "empty" && (
          <p>No hay una oferta disponible para consultar.</p>
        )}
        {historyState.status === "ready" && (
          <PriceHistorySummary summary={historyState.history.summary} />
        )}
      </section>
    </section>
  );
}

export default ProductDetail;
