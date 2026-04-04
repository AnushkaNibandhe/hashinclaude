import Complaint from "../models/Complaint.js";

const VALID_STATUSES = ["RECEIVED", "JOB_CREATED", "IN_PROGRESS", "COMPLETED"];

export const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate("userId", "username role");
    res.json(complaints);
  } catch (error) {
    console.error("getMyComplaints:", error);
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
};

export const createComplaint = async (req, res) => {
  try {
    const { description, imageUrl, category, severity, location } = req.body;
    if (!description) {
      return res.status(400).json({ error: "description is required" });
    }
    const complaint = await Complaint.create({
      userId: req.user.id,
      description,
      imageUrl,
      category,
      severity,
      location,
      status: "RECEIVED",
    });
    res.status(201).json(complaint);
  } catch (error) {
    console.error("createComplaint:", error);
    res.status(500).json({ error: "Failed to create complaint" });
  }
};

export const getComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .sort({ createdAt: -1 })
      .populate("userId", "username role");
    res.json(complaints);
  } catch (error) {
    console.error("getComplaints:", error);
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
};

export const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate(
      "userId",
      "username role"
    );
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }
    res.json(complaint);
  } catch (error) {
    console.error("getComplaintById:", error);
    res.status(500).json({ error: "Failed to fetch complaint" });
  }
};

export const updateComplaintStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
    }
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }
    res.json(complaint);
  } catch (error) {
    console.error("updateComplaintStatus:", error);
    res.status(500).json({ error: "Failed to update complaint status" });
  }
};
