/**
 * Forma común que deberán devolver los futuros adaptadores de tiendas.
 * Es documentación del contrato; todavía no hay persistencia ni lógica asociada.
 *
 * @typedef {Object} NormalizedProduct
 * @property {string} id
 * @property {string} name
 * @property {string} brand
 * @property {number} currentPrice
 * @property {number|null} previousPrice
 * @property {number|null} discountPercentage
 * @property {string} imageUrl
 * @property {string} store
 * @property {string} productUrl
 * @property {boolean} inStock
 */

/**
 * Una presentación exacta agrupada entre tiendas.
 *
 * @typedef {Object} ProductComparison
 * @property {string} productKey Identidad estable de marca + presentación exacta.
 * @property {string} productFamilyKey Identidad de la familia conceptual.
 * @property {"single"|"pack"|"set"} productType
 * @property {number|null} packCount Cantidad sólo cuando es confiable.
 * @property {number|null} unitPrice Precio de la mejor oferta dividido por packCount.
 * @property {NormalizedProduct[]} offers
 */

export {};
