import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import App from "./App.jsx";
import { filterProducts } from "./data/mockProducts.js";
import {
  favoriteFromGroup,
  favoritesStorage,
} from "./favorites/favoritesStorage.js";

function mockSearchApi() {
  global.fetch.mockImplementation(async (url) => {
    if (url === "/api/health") {
      return {
        ok: true,
        json: async () => ({ status: "ok" }),
      };
    }

    const query = decodeURIComponent(url.split("q=")[1] ?? "");
    const products = filterProducts(query);
    const groups = products.map((product) => ({
      id: `group-${product.id}`,
      productKey: `product-${product.id}`,
      brand: product.brand,
      name: product.name,
      imageUrl: product.imageUrl,
      offers: [product],
      bestPriceOfferId: product.inStock ? product.id : null,
      lowestPrice: product.inStock ? product.currentPrice : null,
      savings: null,
      inStock: product.inStock,
    }));
    return {
      ok: true,
      json: async () => ({
        query,
        results: products,
        groups,
        sources: [{ store: "Test", status: "ok" }],
      }),
    };
  });
}

async function searchFor(term) {
  const user = userEvent.setup();
  await user.type(screen.getByRole("searchbox"), term);
  await user.click(screen.getByRole("button", { name: "Buscar" }));
}

describe("Girlie Girl Price Central", () => {
  it("renders the identity and search controls", () => {
    render(<App />);

    expect(screen.getByText("Girlie Girl")).toBeInTheDocument();
    expect(
      screen.getByText("Que complementes tu preciosura con los mejores precios."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("For Cami, now for the girlies 💗"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Powered by tu gordito 💗")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("¿Qué estamos buscando hoy?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Maquillaje" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Compartir Girlie Girl" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inicio" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "Ver Radar" })).toBeInTheDocument();
  });

  it("renders Beauty Radar sections from the aggregated endpoint", async () => {
    global.fetch.mockImplementation(async (url) => {
      if (url === "/api/health") {
        return { ok: true, json: async () => ({ status: "ok" }) };
      }
      if (url.startsWith("/api/beauty-radar")) {
        return {
          ok: true,
          json: async () => ({
            recentDrops: [
              {
                productKey: "drop-1",
                name: "Máscara que bajó",
                store: "Farmacity",
                currentPrice: 9000,
                difference: -1000,
                trend: "down",
              },
            ],
            newHistoricalLows: [
              {
                productKey: "low-1",
                name: "Sérum en mínimo",
                store: "Juleriaque",
                currentPrice: 12000,
                difference: -2000,
                trend: "down",
              },
            ],
            favoriteChanges: [],
          }),
        };
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Radar" }));

    expect(await screen.findByText("Máscara que bajó")).toBeInTheDocument();
    expect(screen.getByText("Sérum en mínimo")).toBeInTheDocument();
    expect(
      screen.getByText("Guardá favoritos para seguir sus cambios."),
    ).toBeInTheDocument();
  });

  it("requests and renders only changes for stored favorites", async () => {
    favoritesStorage.add({
      productKey: "favorite-key",
      brand: "Marca",
      name: "Favorito",
      imageUrl: "",
      searchQuery: "Marca Favorito",
      offerIds: ["offer-favorite"],
    });
    global.fetch.mockImplementation(async (url) => {
      if (url === "/api/health") {
        return { ok: true, json: async () => ({ status: "ok" }) };
      }
      if (url.startsWith("/api/beauty-radar")) {
        return {
          ok: true,
          json: async () => ({
            recentDrops: [],
            newHistoricalLows: [],
            favoriteChanges: [
              {
                productKey: "history-key",
                name: "Favorito con cambio",
                store: "Farmacity",
                currentPrice: 10500,
                difference: 500,
                trend: "up",
              },
            ],
          }),
        };
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Radar" }));

    expect(await screen.findByText("Favorito con cambio")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("favoriteOfferIds=offer-favorite"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("favoriteProductKeys=favorite-key"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("shows gentle empty states when radar data is unavailable", async () => {
    global.fetch.mockImplementation(async (url) => {
      if (url === "/api/health") {
        return { ok: true, json: async () => ({ status: "ok" }) };
      }
      throw new Error("Unavailable");
    });

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Radar" }));

    expect(await screen.findByText("No hubo cambios recientes.")).toBeInTheDocument();
    expect(
      screen.getByText("Aún estamos construyendo el historial."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows clipboard feedback when native sharing is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<App />);

    await userEvent.click(
      screen.getByRole("button", { name: "Compartir Girlie Girl" }),
    );

    expect(await screen.findByText("Link copiado 💗")).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(window.location.origin);
  });

  it("searches mock products and renders results", async () => {
    mockSearchApi();
    render(<App />);
    await searchFor("skincare");

    expect(await screen.findByText("2 productos encontrados")).toBeInTheDocument();
    expect(screen.getByText("Sérum Revitalift Ácido Hialurónico")).toBeInTheDocument();
    expect(screen.getByText("Agua Micelar Todo en 1 Piel Sensible")).toBeInTheDocument();
  });

  it("opens the real product URL in a safe new tab", async () => {
    mockSearchApi();
    render(<App />);
    await searchFor("skincare");

    const productCard = (await screen.findByText("Agua Micelar Todo en 1 Piel Sensible"))
      .closest("article");
    const offer = within(productCard).getByRole("link", { name: "Ver oferta" });
    expect(offer).toHaveAttribute("target", "_blank");
    expect(offer).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByText("Mejor precio")).not.toBeInTheDocument();
  });

  it("opens a minimal product detail and renders price history", async () => {
    const product = filterProducts("skincare")[0];
    const group = {
      id: "history-product",
      productKey: "product-history",
      brand: product.brand,
      name: product.name,
      imageUrl: product.imageUrl,
      offers: [
        {
          ...product,
          historyProductKey: "product-history-legacy",
        },
      ],
      bestPriceOfferId: product.id,
      lowestPrice: product.currentPrice,
      savings: null,
      inStock: true,
    };
    global.fetch.mockImplementation(async (url) => {
      if (url === "/api/health") {
        return { ok: true, json: async () => ({ status: "ok" }) };
      }
      if (url.startsWith("/api/history/")) {
        return {
          ok: true,
          json: async () => ({
            summary: {
              latestPrice: 18000,
              previousPrice: 20000,
              change: -2000,
              trend: "down",
              minimum: 18000,
              maximum: 22000,
              average: 20000,
              goodPrice: true,
              snapshotCount: 5,
            },
            snapshots: [],
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          results: [product],
          groups: [group],
          sources: [],
        }),
      };
    });

    render(<App />);
    await searchFor("skincare");
    await userEvent.click(
      await screen.findByRole("button", { name: "Ver detalle e historial" }),
    );

    expect(screen.getByRole("heading", { name: "Historial de precios" })).toBeInTheDocument();
    expect(await screen.findByText("↓ Bajó $ 2.000")).toBeInTheDocument();
    expect(screen.getByText("Buen precio")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/history/product-history-legacy?"),
      expect.any(Object),
    );
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "← Volver" }));
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("shows stock status from the API response", async () => {
    mockSearchApi();
    render(<App />);
    await searchFor("maquillaje");

    const soldOutCard = (await screen.findByText("Rubor en polvo Mineralize Blush"))
      .closest("article");
    expect(within(soldOutCard).getByText("Sin stock")).toBeInTheDocument();
  });

  it("shows the best price only for comparable offers and reports savings", async () => {
    global.fetch.mockImplementation(async (url) => {
      if (url === "/api/health") {
        return { ok: true, json: async () => ({ status: "ok" }) };
      }
      const offer = (id, store, currentPrice) => ({
        id,
        store,
        currentPrice,
        previousPrice: null,
        discountPercentage: null,
        productUrl: `https://example.com/${id}`,
        inStock: true,
      });
      return {
        ok: true,
        json: async () => ({
          results: [],
          sources: [],
          groups: [{
            id: "sky-high",
            brand: "Maybelline",
            name: "Máscara Sky High",
            imageUrl: "",
            offers: [offer("farmacity", "Farmacity", 17000), offer("pigmento", "Pigmento", 18500)],
            bestPriceOfferId: "farmacity",
            lowestPrice: 17000,
            savings: 1500,
            inStock: true,
          }],
        }),
      };
    });
    render(<App />);
    await searchFor("sky high");

    expect(await screen.findByText("Mejor precio")).toBeInTheDocument();
    expect(screen.getByText(/Ahorrás/)).toHaveTextContent("$ 1.500");
    expect(screen.getAllByRole("link", { name: "Ver oferta" })).toHaveLength(2);
  });

  it("renders packs and sets as independent cards without related sections", async () => {
    const offer = (id, name) => ({
      id,
      name,
      brand: "Marca",
      store: "Tienda",
      currentPrice: 20000,
      previousPrice: null,
      discountPercentage: null,
      imageUrl: "",
      productUrl: `https://example.com/${id}`,
      inStock: true,
    });
    const groups = [
      {
        id: "pack",
        productKey: "product-pack",
        brand: "Marca",
        name: "Producto 100 ml pack x2",
        imageUrl: "",
        offers: [offer("pack-offer", "Producto 100 ml pack x2")],
        bestPriceOfferId: "pack-offer",
        lowestPrice: 20000,
        savings: null,
        inStock: true,
      },
      {
        id: "set",
        productKey: "product-set",
        brand: "Marca",
        name: "Kit Producto + Shampoo",
        imageUrl: "",
        offers: [offer("set-offer", "Kit Producto + Shampoo")],
        bestPriceOfferId: "set-offer",
        lowestPrice: 20000,
        savings: null,
        inStock: true,
      },
    ];
    global.fetch.mockImplementation(async (url) =>
      url === "/api/health"
        ? { ok: true, json: async () => ({ status: "ok" }) }
        : {
            ok: true,
            json: async () => ({
              results: groups.flatMap((group) => group.offers),
              groups,
              sources: [],
            }),
          },
    );

    render(<App />);
    await searchFor("producto");

    expect(await screen.findByText("2 productos encontrados")).toBeInTheDocument();
    expect(screen.getByText("Producto 100 ml pack x2")).toBeInTheDocument();
    expect(screen.getByText("Kit Producto + Shampoo")).toBeInTheDocument();
    expect(screen.queryByText("Packs")).not.toBeInTheDocument();
    expect(screen.queryByText("Sets y combos")).not.toBeInTheDocument();
    expect(screen.queryByText("Mejor valor por unidad")).not.toBeInTheDocument();
  });

  it("shows an empty state when no mock matches", async () => {
    mockSearchApi();
    render(<App />);
    await searchFor("producto inexistente");

    expect(await screen.findByText("No encontramos nada por acá")).toBeInTheDocument();
  });

  it("shows the error state when the real search fails", async () => {
    global.fetch.mockImplementation(async (url) => {
      if (url === "/api/health") {
        return { ok: true, json: async () => ({ status: "ok" }) };
      }
      return { ok: false, status: 502 };
    });
    render(<App />);
    await searchFor("maybelline");

    expect(
      await screen.findByText("Algo no salió como esperábamos"),
    ).toBeInTheDocument();
  });

  it("adds and removes a favorite immediately", async () => {
    mockSearchApi();
    render(<App />);
    await searchFor("skincare");

    const card = (await screen.findByText("Sérum Revitalift Ácido Hialurónico"))
      .closest("article");
    await userEvent.click(
      within(card).getByRole("button", { name: "Agregar a favoritos" }),
    );
    expect(
      within(card).getByRole("button", { name: "Quitar de favoritos" }),
    ).toBeInTheDocument();
    expect(favoritesStorage.getAll()).toHaveLength(1);

    await userEvent.click(
      within(card).getByRole("button", { name: "Quitar de favoritos" }),
    );
    expect(favoritesStorage.getAll()).toHaveLength(0);
  });

  it("restores a favorite after remounting", async () => {
    mockSearchApi();
    const firstRender = render(<App />);
    await searchFor("skincare");
    const card = (await screen.findByText("Sérum Revitalift Ácido Hialurónico"))
      .closest("article");
    await userEvent.click(
      within(card).getByRole("button", { name: "Agregar a favoritos" }),
    );
    firstRender.unmount();

    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /Favoritos/ }));
    expect(
      await screen.findByText("Sérum Revitalift Ácido Hialurónico"),
    ).toBeInTheDocument();
  });

  it("shows the favorites empty state and returns to search", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Favoritos" }));

    expect(
      screen.getByText("Todavía no guardaste ningún producto."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Buscar productos" }));
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("stores a multi-store group as one favorite", async () => {
    const offer = (id, store) => ({
      id,
      store,
      currentPrice: 20000,
      previousPrice: null,
      discountPercentage: null,
      productUrl: `https://example.com/${id}`,
      inStock: true,
    });
    const group = {
      id: "sky-high-group",
      productKey: "product-sky-high",
      brand: "Maybelline",
      name: "Máscara Sky High",
      imageUrl: "",
      offers: [offer("farmacity", "Farmacity"), offer("pigmento", "Pigmento")],
      bestPriceOfferId: "farmacity",
      lowestPrice: 20000,
      savings: null,
      inStock: true,
    };
    global.fetch.mockImplementation(async (url) =>
      url === "/api/health"
        ? { ok: true, json: async () => ({ status: "ok" }) }
        : { ok: true, json: async () => ({ results: group.offers, groups: [group], sources: [] }) },
    );
    render(<App />);
    await searchFor("sky high");
    await userEvent.click(
      screen.getByRole("button", { name: "Agregar a favoritos" }),
    );

    expect(favoritesStorage.getAll()).toHaveLength(1);
    expect(favoritesStorage.getAll()[0].offerIds).toEqual([
      "farmacity",
      "pigmento",
    ]);
  });

  it("keeps unavailable favorites and updates the others independently", async () => {
    const currentGroup = {
      id: "available",
      productKey: "product-a",
      brand: "Marca",
      name: "Producto A",
      imageUrl: "",
      offers: [{
        id: "offer-a",
        store: "Farmacity",
        currentPrice: 12345,
        previousPrice: null,
        discountPercentage: null,
        productUrl: "https://example.com/a",
        inStock: true,
      }],
      bestPriceOfferId: "offer-a",
      lowestPrice: 12345,
      savings: null,
      inStock: true,
    };
    favoritesStorage.add(favoriteFromGroup(currentGroup));
    favoritesStorage.add({
      productKey: "product-b",
      brand: "Marca",
      name: "Producto B",
      imageUrl: "",
      searchQuery: "Producto B",
      offerIds: ["offer-b"],
    });
    global.fetch.mockImplementation(async (url) => {
      if (url === "/api/health") {
        return { ok: true, json: async () => ({ status: "ok" }) };
      }
      if (url.includes("Producto%20B")) throw new Error("offline");
      return {
        ok: true,
        json: async () => ({ groups: [currentGroup] }),
      };
    });

    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /Favoritos/ }));

    expect(await screen.findByText("$ 12.345")).toBeInTheDocument();
    expect(
      await screen.findByText("Sin ofertas disponibles en este momento"),
    ).toBeInTheDocument();
    expect(favoritesStorage.getAll()).toHaveLength(2);
  });

  it("navigates between the four accessible tabs and marks the active tab", async () => {
    const user = userEvent.setup();
    render(<App />);

    const navigation = screen.getByRole("navigation", {
      name: "Navegación principal",
    });
    expect(within(navigation).getAllByRole("button")).toHaveLength(4);
    expect(within(navigation).getByRole("button", { name: "Inicio" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await user.click(within(navigation).getByRole("button", { name: "Radar" }));
    expect(screen.getByRole("heading", { name: "✨ Beauty Radar" })).toBeInTheDocument();
    expect(within(navigation).getByRole("button", { name: "Radar" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await user.click(within(navigation).getByRole("button", { name: "Favoritos" }));
    expect(screen.getByRole("heading", { name: "Mis favoritos" })).toBeInTheDocument();
  });

  it("preserves the current search when visiting Radar and Favoritos", async () => {
    mockSearchApi();
    const user = userEvent.setup();
    render(<App />);
    await searchFor("sky high");

    expect(await screen.findByText("Para “sky high”")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Radar" }));
    await user.click(screen.getByRole("button", { name: "Favoritos" }));
    await user.click(screen.getByRole("button", { name: "Ir a Buscar" }));

    expect(screen.getByRole("searchbox")).toHaveValue("sky high");
    expect(screen.getByText("Para “sky high”")).toBeInTheDocument();
  });

  it("returns to Inicio when the logo is activated", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Radar" }));
    await user.click(
      screen.getByRole("link", { name: "Girlie Girl Price Central, inicio" }),
    );

    expect(screen.getByRole("button", { name: "Inicio" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("heading", {
        name: "Encontrá eso que te encanta, al mejor precio.",
      }),
    ).toBeInTheDocument();
  });

  it("shows a refreshed Farmaplus offer instead of an unavailable favorite", async () => {
    const currentGroup = {
      id: "revlon-current",
      productKey: "revlon-current-key",
      brand: "Revlon",
      name: "Colorstay Skin Awaken 5 In 1 Concealer Corrector 015 Light 8 ml",
      displayName:
        "Revlon Colorstay Skin Awaken 5 In 1 Concealer Corrector 015 Light 8 ml",
      imageUrl: "",
      offers: [
        {
          id: "farmaplus-current",
          store: "Farmaplus",
          currentPrice: 10428,
          productUrl: "https://example.com/revlon",
          inStock: true,
        },
      ],
      bestPriceOfferId: "farmaplus-current",
      lowestPrice: 10428,
      savings: null,
      inStock: true,
    };
    favoritesStorage.add({
      productKey: "revlon-legacy-key",
      brand: "Revlon",
      name: "Revlon Colorstay Skin Awaken 5 In 1 Concealer Corrector 015 Light 8 ml",
      imageUrl: "",
      searchQuery: "Revlon Colorstay Skin Awaken Concealer 015 Light 8 ml",
      offerIds: ["farmaplus-legacy"],
    });
    global.fetch.mockImplementation(async (url) => {
      if (url === "/api/health") {
        return { ok: true, json: async () => ({ status: "ok" }) };
      }
      if (url.startsWith("/api/beauty-radar")) {
        return {
          ok: true,
          json: async () => ({
            recentDrops: [],
            newHistoricalLows: [],
            favoriteChanges: [],
          }),
        };
      }
      if (url.startsWith("/api/history")) {
        return { ok: false, json: async () => ({}) };
      }
      return {
        ok: true,
        json: async () => ({
          groups: [currentGroup],
          results: currentGroup.offers,
          sources: [
            { store: "Farmaplus", status: "ok" },
            { store: "Juleriaque", status: "error" },
          ],
        }),
      };
    });

    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Favoritos" }));

    expect(await screen.findByText("Farmaplus")).toBeInTheDocument();
    expect(screen.getByText("$ 10.428")).toBeInTheDocument();
    expect(screen.queryByText("Sin ofertas disponibles en este momento")).not.toBeInTheDocument();
  });

  it("keeps an offer found by detail when returning to Favoritos", async () => {
    const currentGroup = {
      id: "revlon-current",
      productKey: "revlon-current-key",
      brand: "Revlon",
      name: "Colorstay Skin Awaken 5 In 1 Concealer Corrector 015 Light 8 ml",
      displayName:
        "Revlon Colorstay Skin Awaken 5 In 1 Concealer Corrector 015 Light 8 ml",
      imageUrl: "",
      offers: [
        {
          id: "farmaplus-current",
          store: "Farmaplus",
          currentPrice: 10428,
          productUrl: "https://example.com/revlon",
          inStock: true,
        },
      ],
      bestPriceOfferId: "farmaplus-current",
      lowestPrice: 10428,
      savings: null,
      inStock: true,
    };
    favoritesStorage.add({
      productKey: "revlon-legacy-key",
      brand: "Revlon",
      name: currentGroup.displayName,
      imageUrl: "",
      searchQuery: currentGroup.displayName,
      offerIds: ["farmaplus-legacy"],
    });
    global.fetch.mockImplementation(async (url) => {
      if (url === "/api/health") {
        return { ok: true, json: async () => ({ status: "ok" }) };
      }
      if (url.startsWith("/api/beauty-radar")) {
        return {
          ok: true,
          json: async () => ({
            recentDrops: [],
            newHistoricalLows: [],
            favoriteChanges: [],
          }),
        };
      }
      if (url.startsWith("/api/history")) {
        return { ok: false, json: async () => ({}) };
      }
      if (url === "/api/search?q=revlon") {
        return {
          ok: true,
          json: async () => ({
            groups: [currentGroup],
            results: currentGroup.offers,
            sources: [{ store: "Farmaplus", status: "ok" }],
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ groups: [], results: [], sources: [] }),
      };
    });

    render(<App />);
    await searchFor("revlon");
    await userEvent.click(
      await screen.findByRole("button", { name: "Ver detalle e historial" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Favoritos" }));

    expect(screen.getByText("Farmaplus")).toBeInTheDocument();
    expect(screen.queryByText("Sin ofertas disponibles en este momento")).not.toBeInTheDocument();
  });
});
