import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import bidRoutes from "./routes/bidRoutes.js";
import seedRoutes from "./routes/seedRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/bids", bidRoutes);
app.use("/api/seed", seedRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
