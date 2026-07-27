import { Router } from "express";

import {
  SearchServiceError,
  defaultSearchService,
} from "../services/productSearch.js";

const MAX_QUERY_LENGTH = 80;

export function createSearchRouter({
  searchService = defaultSearchService,
} = {}) {
  const router = Router();

  router.get("/", async (request, response) => {
    const query = typeof request.query.q === "string" ? request.query.q.trim() : "";

    if (!query) {
      return response.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "El parámetro q es obligatorio.",
        },
      });
    }

    if (query.length > MAX_QUERY_LENGTH) {
      return response.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: `La búsqueda no puede superar ${MAX_QUERY_LENGTH} caracteres.`,
        },
      });
    }

    try {
      const search = await searchService.search(query);
      return response.json({ query, ...search });
    } catch (error) {
      const controlledError =
        error instanceof SearchServiceError
          ? error
          : new SearchServiceError(
              "STORE_UNAVAILABLE",
              "No pudimos consultar la tienda en este momento.",
              502,
            );

      console.error("[product-search]", {
        code: controlledError.code,
        stores:
          "Juleriaque, Farmacity, Pigmento, Farmaonline, Farmaplus, Simplicity",
        query,
        cause: error instanceof Error ? error.message : "Unknown error",
      });

      return response.status(controlledError.status).json({
        error: {
          code: controlledError.code,
          message: controlledError.message,
        },
      });
    }
  });

  return router;
}
