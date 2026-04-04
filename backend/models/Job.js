import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Complaint",
    required: false, // optional — demo jobs have no complaint
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  category: String,
  severity: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH"],
    default: "LOW",
  },
  imageUrl: String, // Cover image for the job (uploaded by authority)
  status: {
    type: String,
    enum: ["OPEN", "ASSIGNED", "IN_PROGRESS", "COMPLETED"],
    default: "OPEN",
  },
  location: {
    lat: Number,
    lng: Number,
    address: String,
  },

  source: {
    type: String,
    default: "ADMIN",
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  // Completion proof
  completionImage: String,
  completionLocation: {
    lat: Number,
    lng: Number,
  },
  completedAt: Date,
  isVerifiedCompletion: {
    type: Boolean,
    default: false,
  },
  isDemoJob: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

export default mongoose.model("Job", jobSchema);
