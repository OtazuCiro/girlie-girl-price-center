import express from "express";

import healthRouter from "./routes/health.js";
import { createSearchRouter } from "./routes/search.js";

export function createApp({ searchService } = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());
  app.use("/api/health", healthRouter);
  app.use("/api/search", createSearchRouter({ searchService }));

  return app;
}

export default createApp();

