import express from "express";

import { createBeautyRadarRouter } from "./routes/beautyRadar.js";
import healthRouter from "./routes/health.js";
import { createHistoryRouter } from "./routes/history.js";
import { createSearchRouter } from "./routes/search.js";

export function createApp({ searchService, historyService } = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());
  app.use("/api/health", healthRouter);
  app.use("/api/beauty-radar", createBeautyRadarRouter({ historyService }));
  app.use("/api/search", createSearchRouter({ searchService }));
  app.use("/api/history", createHistoryRouter({ historyService }));

  return app;
}

export default createApp();
