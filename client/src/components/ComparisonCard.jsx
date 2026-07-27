function formatPrice(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function ComparisonCard({ group }) {
  return (
    <article className={`comparison-card ${!group.inStock ? "comparison-card--sold-out" : ""}`}>
      <div className="comparison-card__image">
        <img
          src={group.imageUrl || "/icon-192.png"}
          alt=""
          width="240"
          height="240"
          loading="lazy"
        />
      </div>

      <div className="comparison-card__body">
        <p className="comparison-card__brand">{group.brand}</p>
        <h3>{group.name}</h3>
        <p className="comparison-card__summary">
          {group.lowestPrice
            ? `Desde ${formatPrice(group.lowestPrice)}`
            : "Sin stock disponible"}
          {group.offers.length > 1 && ` · ${group.offers.length} tiendas`}
        </p>

        {group.savings && (
          <p className="comparison-card__savings">
            Ahorrás {formatPrice(group.savings)} frente a la siguiente oferta
          </p>
        )}

        <div className="offer-list">
          {group.offers.map((offer) => {
            const isBest =
              group.offers.length > 1 &&
              offer.inStock &&
              offer.id === group.bestPriceOfferId;

            return (
              <section className="offer" key={`${offer.store}-${offer.id}`}>
                <div className="offer__store">
                  <strong>{offer.store}</strong>
                  <span className={offer.inStock ? "stock stock--available" : "stock"}>
                    {offer.inStock ? "En stock" : "Sin stock"}
                  </span>
                </div>
                <div className="offer__price">
                  {isBest && <span className="best-price">Mejor precio</span>}
                  <strong>{formatPrice(offer.currentPrice)}</strong>
                  {offer.previousPrice && (
                    <span className="previous-price">
                      {formatPrice(offer.previousPrice)}
                    </span>
                  )}
                  {offer.discountPercentage && (
                    <span className="discount">-{offer.discountPercentage}%</span>
                  )}
                </div>
                <a href={offer.productUrl} target="_blank" rel="noopener noreferrer">
                  Ver oferta
                </a>
              </section>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export default ComparisonCard;
