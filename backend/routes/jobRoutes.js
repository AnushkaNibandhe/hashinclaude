import express from "express";
import {
  getJobs,
  createJob,
  createDemoJob,
  getDemoPresets,
  getOpenJobs,
  assignJob,
  updateJobStatus,
} from "../controllers/jobController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getJobs);
router.post("/", protect, createJob);
router.post("/demo", protect, createDemoJob);
router.get("/demo/presets", protect, getDemoPresets);
router.get("/open", protect, getOpenJobs);
router.put("/:id/assign", protect, assignJob);
router.put("/:id/status", protect, updateJobStatus);

export default router;
