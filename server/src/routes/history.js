import { Router } from "express";

import { defaultPriceHistoryService } from "../history/defaultPriceHistoryService.js";

const MAX_PRODUCT_KEY_LENGTH = 100;
const MAX_STORE_LENGTH = 80;
const MAX_SNAPSHOT_LIMIT = 50;

export function createHistoryRouter({
  historyService = defaultPriceHistoryService,
} = {}) {
  const router = Router();

  router.get("/:productKey", async (request, response) => {
    const productKey = request.params.productKey.trim();
    const store =
      typeof request.query.store === "string" ? request.query.store.trim() : "";
    const requestedLimit = Number(request.query.limit ?? 20);

    if (
      !productKey ||
      productKey.length > MAX_PRODUCT_KEY_LENGTH ||
      !store ||
      store.length > MAX_STORE_LENGTH ||
      !Number.isInteger(requestedLimit) ||
      requestedLimit < 1
    ) {
      return response.status(400).json({
        error: {
          code: "INVALID_HISTORY_QUERY",
          message: "Producto, tienda o límite inválido.",
        },
      });
    }

    if (!historyService.enabled) {
      return response.status(503).json({
        error: {
          code: "HISTORY_UNAVAILABLE",
          message: "El historial de precios no está disponible en este momento.",
        },
      });
    }

    try {
      const history = await historyService.getHistory(
        productKey,
        store,
        Math.min(requestedLimit, MAX_SNAPSHOT_LIMIT),
      );
      return response.json(history);
    } catch {
      return response.status(503).json({
        error: {
          code: "HISTORY_UNAVAILABLE",
          message: "El historial de precios no está disponible en este momento.",
        },
      });
    }
  });

  return router;
}
