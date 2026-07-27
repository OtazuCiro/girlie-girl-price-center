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
});
