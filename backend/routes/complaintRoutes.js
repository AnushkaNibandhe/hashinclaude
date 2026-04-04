import express from "express";
import { createComplaint, getComplaints, getComplaintById, getMyComplaints, updateComplaintStatus } from "../controllers/complaintController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createComplaint);
router.get("/", protect, getComplaints);
router.get("/my", protect, getMyComplaints);
router.get("/:id", protect, getComplaintById);
router.patch("/:id/status", protect, updateComplaintStatus);

export default router;
