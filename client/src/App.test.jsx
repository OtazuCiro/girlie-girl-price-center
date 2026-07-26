import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import App from "./App.jsx";

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
    render(<App />);
    await searchFor("skincare");

    expect(await screen.findByText("2 productos encontrados")).toBeInTheDocument();
    expect(screen.getByText("Sérum Revitalift Ácido Hialurónico")).toBeInTheDocument();
    expect(screen.getByText("Agua Micelar Todo en 1 Piel Sensible")).toBeInTheDocument();
  });

  it("marks the lowest in-stock product as best price", async () => {
    render(<App />);
    await searchFor("productos");

    const garnierCard = (await screen.findByText("Agua Micelar Todo en 1 Piel Sensible"))
      .closest("article");
    expect(within(garnierCard).getByText("Mejor precio")).toBeInTheDocument();
  });

  it("does not let an out-of-stock product win best price", async () => {
    render(<App />);
    await searchFor("maquillaje");

    const soldOutCard = (await screen.findByText("Rubor en polvo Mineralize Blush"))
      .closest("article");
    expect(within(soldOutCard).queryByText("Mejor precio")).not.toBeInTheDocument();
    expect(within(soldOutCard).getByText("Sin stock")).toBeInTheDocument();
  });

  it("shows an empty state when no mock matches", async () => {
    render(<App />);
    await searchFor("producto inexistente");

    expect(await screen.findByText("No encontramos nada por acá")).toBeInTheDocument();
  });
});

