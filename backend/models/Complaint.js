import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  description: String,
  imageUrl: String,
  category: String,
  severity: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH"],
  },
  location: {
    lat: Number,
    lng: Number,
    address: String,
  },
  status: {
    type: String,
    enum: ["RECEIVED", "JOB_CREATED", "IN_PROGRESS", "COMPLETED"],
    default: "RECEIVED",
  },
}, { timestamps: true });

export default mongoose.model("Complaint", complaintSchema);
