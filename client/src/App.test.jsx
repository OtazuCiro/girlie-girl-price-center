import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import App from "./App.jsx";
import { filterProducts } from "./data/mockProducts.js";

function mockSearchApi() {
  global.fetch.mockImplementation(async (url) => {
    if (url === "/api/health") {
      return {
        ok: true,
        json: async () => ({ status: "ok" }),
      };
    }

    const query = decodeURIComponent(url.split("q=")[1] ?? "");
    return {
      ok: true,
      json: async () => ({ query, results: filterProducts(query) }),
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
    expect(screen.getByText("Powered by tu gordito 💗")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("¿Qué estamos buscando hoy?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Maquillaje" })).toBeInTheDocument();
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
});
