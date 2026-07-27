function formatPrice(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function RelatedProducts({ title, products, bestValueProductKey }) {
  if (!products?.length) return null;

  return (
    <details className="related-products">
      <summary>
        {title} <span>{products.length}</span>
      </summary>
      <div className="related-products__list">
        {products.map((product) => {
          const offer =
            product.offers.find((candidate) => candidate.inStock) ??
            product.offers[0];

          return (
            <article className="related-product" key={product.productKey}>
              <div>
                <strong>{product.name}</strong>
                <span>{offer?.store ?? "Sin ofertas disponibles"}</span>
                {offer && (
                  <span className={offer.inStock ? "stock stock--available" : "stock"}>
                    {offer.inStock ? "En stock" : "Sin stock"}
                  </span>
                )}
                {product.unitPrice && (
                  <small>{formatPrice(product.unitPrice)} por unidad</small>
                )}
                {product.productKey === bestValueProductKey && (
                  <small className="best-value">Mejor valor por unidad</small>
                )}
              </div>
              <div className="related-product__action">
                {offer && <strong>{formatPrice(offer.currentPrice)}</strong>}
                {offer && (
                  <a
                    href={offer.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver oferta
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </details>
  );
}

function ComparisonCard({
  group,
  isFavorite = false,
  onToggleFavorite,
  availabilityMessage,
}) {
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
        {onToggleFavorite && (
          <button
            className={`favorite-toggle ${isFavorite ? "favorite-toggle--active" : ""}`}
            type="button"
            aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            aria-pressed={isFavorite}
            onClick={onToggleFavorite}
          >
            <span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span>
          </button>
        )}
      </div>

      <div className="comparison-card__body">
        <p className="comparison-card__brand">{group.brand}</p>
        <h3>{group.name}</h3>
        {availabilityMessage ? (
          <p className="favorite-availability">{availabilityMessage}</p>
        ) : (
          <p className="comparison-card__summary">
            {group.lowestPrice
              ? `Desde ${formatPrice(group.lowestPrice)}`
              : "Sin stock disponible"}
            {group.offers.length > 1 && ` · ${group.offers.length} tiendas`}
          </p>
        )}

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

        <div className="related-sections">
          <RelatedProducts
            title="Otras presentaciones"
            products={group.relatedProducts?.variants}
            bestValueProductKey={group.bestValueProductKey}
          />
          <RelatedProducts
            title="Packs"
            products={group.relatedProducts?.packs}
            bestValueProductKey={group.bestValueProductKey}
          />
          <RelatedProducts
            title="Sets y combos"
            products={group.relatedProducts?.sets}
            bestValueProductKey={group.bestValueProductKey}
          />
        </div>
      </div>
    </article>
  );
}

export default ComparisonCard;
