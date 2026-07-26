function formatPrice(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function ProductCard({ product }) {
  return (
    <article className={`product-card ${!product.inStock ? "product-card--sold-out" : ""}`}>
      <div className="product-card__image">
        <img
          src={product.imageUrl || "/icon-192.png"}
          alt=""
          width="240"
          height="240"
          loading="lazy"
        />
      </div>
      <div className="product-card__body">
        <p className="product-card__brand">{product.brand}</p>
        <h3>{product.name}</h3>
        <p className="product-card__store">En {product.store}</p>

        <div className="product-card__pricing">
          <strong>{formatPrice(product.currentPrice)}</strong>
          {product.previousPrice && (
            <span className="previous-price">{formatPrice(product.previousPrice)}</span>
          )}
          {product.discountPercentage && (
            <span className="discount">-{product.discountPercentage}%</span>
          )}
        </div>

        <div className="product-card__actions">
          <span className={product.inStock ? "stock stock--available" : "stock"}>
            {product.inStock ? "En stock" : "Sin stock"}
          </span>
          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver oferta
          </a>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
