/**
 * Productos de demostración con el contrato NormalizedProduct del servidor.
 * No representan tiendas, precios ni ofertas reales.
 */
export const MOCK_PRODUCTS = [
  {
    id: "maybelline-sky-high",
    name: "Máscara de pestañas Lash Sensational Sky High",
    brand: "Maybelline",
    currentPrice: 18990,
    previousPrice: 23990,
    discountPercentage: 21,
    imageUrl: "/products/mascara.svg",
    store: "Beauty Store",
    productUrl: "#oferta-maybelline",
    inStock: true,
    category: "maquillaje",
    keywords: ["máscara", "pestañas", "rimel"],
  },
  {
    id: "loreal-serum",
    name: "Sérum Revitalift Ácido Hialurónico",
    brand: "L'Oréal Paris",
    currentPrice: 24450,
    previousPrice: 28900,
    discountPercentage: 15,
    imageUrl: "/products/serum.svg",
    store: "Glow Market",
    productUrl: "#oferta-loreal",
    inStock: true,
    category: "skincare",
    keywords: ["serum", "sérum", "rostro", "hialurónico"],
  },
  {
    id: "garnier-micelar",
    name: "Agua Micelar Todo en 1 Piel Sensible",
    brand: "Garnier",
    currentPrice: 9850,
    previousPrice: 11590,
    discountPercentage: 15,
    imageUrl: "/products/micelar.svg",
    store: "Rosa Beauty",
    productUrl: "#oferta-garnier",
    inStock: true,
    category: "skincare",
    keywords: ["agua", "micelar", "limpieza", "rostro"],
  },
  {
    id: "revlon-labial",
    name: "Labial Super Lustrous Rose Velvet",
    brand: "Revlon",
    currentPrice: 12790,
    previousPrice: null,
    discountPercentage: null,
    imageUrl: "/products/labial.svg",
    store: "Beauty Store",
    productUrl: "#oferta-revlon",
    inStock: true,
    category: "maquillaje",
    keywords: ["labial", "lipstick", "rosa"],
  },
  {
    id: "kerastase-elixir",
    name: "Óleo capilar Elixir Ultime",
    brand: "Kérastase",
    currentPrice: 54900,
    previousPrice: 61900,
    discountPercentage: 11,
    imageUrl: "/products/oleo.svg",
    store: "Hair Boutique",
    productUrl: "#oferta-kerastase",
    inStock: true,
    category: "pelo",
    keywords: ["óleo", "aceite", "capilar", "cabello"],
  },
  {
    id: "mac-blush",
    name: "Rubor en polvo Mineralize Blush",
    brand: "MAC",
    currentPrice: 8900,
    previousPrice: 14200,
    discountPercentage: 37,
    imageUrl: "/products/rubor.svg",
    store: "Makeup House",
    productUrl: "#oferta-mac",
    inStock: false,
    category: "maquillaje",
    keywords: ["rubor", "blush", "polvo"],
  },
];

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");
}

export function filterProducts(query) {
  const term = normalize(query.trim());
  if (!term) return [];

  const allTerms = ["todo", "todos", "belleza", "producto", "productos"];
  if (allTerms.includes(term)) return [...MOCK_PRODUCTS];

  return MOCK_PRODUCTS.filter((product) => {
    const searchable = [
      product.name,
      product.brand,
      product.category,
      ...product.keywords,
    ]
      .map(normalize)
      .join(" ");
    return searchable.includes(term);
  });
}
