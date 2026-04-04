import Job from "../models/Job.js";
import Complaint from "../models/Complaint.js";
import Bid from "../models/Bid.js";
import User from "../models/User.js";
import { sendJobCreatedEmail, sendJobAssignedEmail, sendJobCompletedEmail } from "../utils/mailer.js";

// ─── DEMO JOB PRESETS ─────────────────────────────────────────────────────────
const DEMO_JOBS = [
  {
    title: "Pothole Repair - FC Road",
    description: "Large pothole near FC Road signal causing accidents and traffic slowdowns. Immediate repair required.",
    category: "POTHOLE",
    severity: "HIGH",
    location: { lat: 18.5204, lng: 73.8567, address: "FC Road, Pune" },
  },
  {
    title: "Street Light Outage - Baner",
    description: "Multiple street lights non-functional on the stretch between Baner road and highway junction.",
    category: "ELECTRICAL",
    severity: "MEDIUM",
    location: { lat: 18.5590, lng: 73.7868, address: "Baner Road, Pune" },
  },
  {
    title: "Drainage Blockage - Koregaon Park",
    description: "Severe drainage blockage causing waterlogging during rains near Koregaon Park main road.",
    category: "DRAINAGE",
    severity: "HIGH",
    location: { lat: 18.5362, lng: 73.8927, address: "Koregaon Park, Pune" },
  },
  {
    title: "Broken Footpath - Kothrud",
    description: "Large sections of footpath broken and uplifted near Kothrud depot bus stop creating hazard.",
    category: "FOOTPATH",
    severity: "LOW",
    location: { lat: 18.5074, lng: 73.8077, address: "Kothrud Depot, Pune" },
  },
  {
    title: "Water Pipe Leak - Aundh",
    description: "Visible water pipe burst causing water wastage and road damage near Aundh ITI junction.",
    category: "WATER",
    severity: "HIGH",
    location: { lat: 18.5679, lng: 73.8143, address: "Aundh ITI Road, Pune" },
  },
];

// ─── CREATE DEMO JOB ──────────────────────────────────────────────────────────
export const createDemoJob = async (req, res) => {
  try {
    const { preset } = req.body; // 0-4 preset index, or custom payload
    let payload;

    if (typeof preset === "number" && DEMO_JOBS[preset]) {
      payload = DEMO_JOBS[preset];
    } else if (req.body.title) {
      // Custom payload passed directly
      const { title, description, category, severity, location } = req.body;
      payload = { title, description, category, severity, location };
    } else {
      // Random demo job
      payload = DEMO_JOBS[Math.floor(Math.random() * DEMO_JOBS.length)];
    }

    const job = await Job.create({
      ...payload,
      status: "OPEN",
      isDemoJob: true,
    });

    res.status(201).json(job);
  } catch (error) {
    console.error("createDemoJob error:", error);
    res.status(500).json({ error: "Failed to create demo job" });
  }
};

// ─── CREATE JOB (from complaint) ─────────────────────────────────────────────
export const createJob = async (req, res) => {
  try {
    const { complaintId, title, description, category, severity, location, imageUrl, isVerified } = req.body;
    const source = req.body.source || "ADMIN";

    // complaintId is now optional (demo jobs don't have one)
    let complaint = null;
    if (complaintId) {
      complaint = await Complaint.findById(complaintId);
      if (!complaint) return res.status(404).json({ error: "Complaint not found" });
    }

    const job = await Job.create({
      complaintId: complaintId || undefined,
      title,
      description,
      category,
      severity,
      location,
      imageUrl,
      source,
      isVerified,
      status: "OPEN",
    });

    if (complaint) {
      await Complaint.findByIdAndUpdate(complaintId, { status: "JOB_CREATED" });
    }

    // Send email notification (non-blocking)
    sendJobCreatedEmail(job).catch((err) => console.error("Mail error (createJob):", err));

    res.status(201).json(job);
  } catch (error) {
    console.error("createJob error:", error);
    res.status(500).json({ error: "Failed to create job" });
  }
};

// ─── GET ALL JOBS ─────────────────────────────────────────────────────────────
export const getJobs = async (req, res) => {
  try {
    const jobs = await Job.find()
      .sort({ createdAt: -1 })
      .populate("complaintId")
      .populate("assignedTo", "username role");

    res.status(200).json(jobs);
  } catch (error) {
    console.error("getJobs error:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
};

// ─── GET OPEN JOBS ────────────────────────────────────────────────────────────
export const getOpenJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ status: "OPEN" }).sort({ createdAt: -1 });
    res.status(200).json(jobs);
  } catch (error) {
    console.error("getOpenJobs error:", error);
    res.status(500).json({ error: "Failed to fetch open jobs" });
  }
};

// ─── ASSIGN JOB ───────────────────────────────────────────────────────────────
export const assignJob = async (req, res) => {
  try {
    const { contractorId, bidId } = req.body;
    const { id } = req.params;

    const contractor = await User.findById(contractorId);
    if (!contractor) return res.status(404).json({ error: "Contractor not found" });

    const job = await Job.findByIdAndUpdate(
      id,
      { assignedTo: contractorId, status: "ASSIGNED" },
      { new: true }
    ).populate("assignedTo", "username role");

    if (bidId) {
      await Bid.findByIdAndUpdate(bidId, { status: "ACCEPTED" });
      await Bid.updateMany(
        { jobId: id, _id: { $ne: bidId } },
        { status: "REJECTED" }
      );
    }

    // If job has a linked complaint, update its status
    if (job.complaintId) {
      await Complaint.findByIdAndUpdate(job.complaintId, { status: "JOB_CREATED" });
    }

    // Send assignment email (non-blocking)
    sendJobAssignedEmail(job, contractor.username).catch((err) => console.error("Mail error (assignJob):", err));

    res.status(200).json(job);
  } catch (error) {
    console.error("assignJob error:", error);
    res.status(500).json({ error: "Failed to assign job" });
  }
};

// ─── UPDATE JOB STATUS ───────────────────────────────────────────────────────
export const updateJobStatus = async (req, res) => {
  try {
    const { status, completionImage, completionLocation, completedAt, isVerifiedCompletion } = req.body;
    const { id } = req.params;

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ error: "Job not found" });

    job.status = status;

    // Save completion proof when marking complete
    if (status === "COMPLETED") {
      if (completionImage) job.completionImage = completionImage;
      if (completionLocation) job.completionLocation = completionLocation;
      if (completedAt) job.completedAt = completedAt;
      if (isVerifiedCompletion !== undefined) job.isVerifiedCompletion = isVerifiedCompletion;

      // Update linked complaint if it exists
      if (job.complaintId) {
        await Complaint.findByIdAndUpdate(job.complaintId, { status: "COMPLETED" });
      }
    } else if (status === "IN_PROGRESS" && job.complaintId) {
      await Complaint.findByIdAndUpdate(job.complaintId, { status: "IN_PROGRESS" });
    }

    await job.save();

    // Send completion email (non-blocking)
    if (status === "COMPLETED") {
      sendJobCompletedEmail(job).catch((err) => console.error("Mail error (updateJobStatus):", err));
    }

    res.status(200).json(job);
  } catch (error) {
    console.error("updateJobStatus error:", error);
    res.status(500).json({ error: "Failed to update job status" });
  }
};

// ─── GET DEMO JOB PRESETS ────────────────────────────────────────────────────
export const getDemoPresets = async (req, res) => {
  res.json(DEMO_JOBS.map((j, i) => ({ index: i, title: j.title, category: j.category, severity: j.severity, location: j.location })));
};
