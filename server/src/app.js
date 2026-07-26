import express from "express";

import healthRouter from "./routes/health.js";

const app = express();

app.disable("x-powered-by");
app.use(express.json());
app.use("/api/health", healthRouter);

export default app;

