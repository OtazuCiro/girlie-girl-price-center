import { Router } from "express";

import { defaultPriceHistoryService } from "../history/defaultPriceHistoryService.js";

const MAX_FAVORITE_IDENTIFIERS = 40;
const MAX_IDENTIFIER_LENGTH = 120;

function parseIdentifiers(value) {
  if (typeof value !== "string" || !value.trim()) return [];

  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(
          (item) => item.length > 0 && item.length <= MAX_IDENTIFIER_LENGTH,
        )
        .slice(0, MAX_FAVORITE_IDENTIFIERS),
    ),
  ];
}

function emptyRadar() {
  return {
    recentDrops: [],
    newHistoricalLows: [],
    favoriteChanges: [],
  };
}

export function createBeautyRadarRouter({
  historyService = defaultPriceHistoryService,
} = {}) {
  const router = Router();

  router.get("/", async (request, response) => {
    if (!historyService.enabled || !historyService.getBeautyRadar) {
      return response.json(emptyRadar());
    }

    try {
      const radar = await historyService.getBeautyRadar({
        favoriteOfferIds: parseIdentifiers(request.query.favoriteOfferIds),
        favoriteProductKeys: parseIdentifiers(
          request.query.favoriteProductKeys,
        ),
        limit: 10,
      });
      return response.json(radar ?? emptyRadar());
    } catch {
      console.error("[beauty-radar]", { code: "RADAR_READ_FAILED" });
      return response.json(emptyRadar());
    }
  });

  return router;
}
