import express from "express";
import cors from "cors";

import authRoutes from "../routes/authRoutes.js";
import complaintRoutes from "../routes/complaintRoutes.js";
import uploadRoutes from "../routes/uploadRoutes.js";
import jobRoutes from "../routes/jobRoutes.js";
import bidRoutes from "../routes/bidRoutes.js";

/**
 * Creates and returns a configured Express app without calling app.listen.
 * Used by Supertest in integration/property-based tests.
 */
export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/complaints", complaintRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/jobs", jobRoutes);
  app.use("/api/bids", bidRoutes);

  return app;
}
