/**
 * Forma común que deberán devolver los futuros adaptadores de tiendas.
 * Es documentación del contrato; todavía no hay persistencia ni lógica asociada.
 *
 * @typedef {Object} NormalizedProduct
 * @property {string} id
 * @property {string} originalName Nombre recibido desde la tienda.
 * @property {string} normalizedName Identidad técnica determinística.
 * @property {string} displayName Nombre editorial utilizado por la interfaz.
 * @property {string[]} searchTokens Tokens internos normalizados y sin duplicados.
 * @property {string} name
 * @property {string} originalBrand Marca recibida desde la tienda.
 * @property {string} brand
 * @property {number} currentPrice
 * @property {number|null} previousPrice
 * @property {number|null} discountPercentage
 * @property {string} imageUrl
 * @property {string} store
 * @property {string} productUrl
 * @property {boolean} inStock
 */

export {};
