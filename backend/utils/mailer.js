import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_FROM,
    pass: process.env.MAIL_APP_PASSWORD, // Gmail App Password (not account password)
  },
});

const AUTHORITY_EMAIL = process.env.MAIL_TO || "nibandheanushka@gmail.com";

const SEVERITY_COLOR = { HIGH: "#EF4444", MEDIUM: "#F59E0B", LOW: "#10B981" };
const STATUS_COLOR   = { OPEN: "#3B82F6", ASSIGNED: "#8B5CF6", IN_PROGRESS: "#F97316", COMPLETED: "#10B981" };

function severityBadge(severity) {
  const color = SEVERITY_COLOR[severity] || "#6B7280";
  return `<span style="display:inline-block;padding:3px 12px;border-radius:999px;background:${color}22;color:${color};font-size:12px;font-weight:700;border:1px solid ${color}44;">${severity}</span>`;
}

function statusBadge(status) {
  const color = STATUS_COLOR[status] || "#6B7280";
  const label = status.replace("_", " ");
  return `<span style="display:inline-block;padding:3px 12px;border-radius:999px;background:${color}22;color:${color};font-size:12px;font-weight:700;border:1px solid ${color}44;">${label}</span>`;
}

function baseTemplate({ preheader, headerColor, headerIcon, headerTitle, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>FixMyCity</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Segoe UI',Arial,sans-serif;">
  <!-- preheader -->
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header bar -->
        <tr>
          <td style="background:${headerColor};border-radius:16px 16px 0 0;padding:28px 36px;text-align:center;">
            <div style="font-size:28px;margin-bottom:6px;">${headerIcon}</div>
            <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">${headerTitle}</div>
            <div style="color:rgba(255,255,255,0.75);font-size:13px;margin-top:4px;">FixMyCity · Civic Issue Management</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#1a1a1a;padding:32px 36px;border-radius:0 0 16px 16px;border:1px solid #2a2a2a;border-top:none;">
            ${bodyHtml}

            <!-- Footer -->
            <div style="margin-top:36px;padding-top:20px;border-top:1px solid #2a2a2a;text-align:center;">
              <p style="color:#555;font-size:11px;margin:0;">This is an automated notification from <strong style="color:#888;">FixMyCity</strong>.</p>
              <p style="color:#555;font-size:11px;margin:6px 0 0;">Please do not reply to this email.</p>
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function row(label, value) {
  return `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#888;font-size:13px;width:140px;vertical-align:top;">${label}</td>
    <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;color:#e5e5e5;font-size:13px;vertical-align:top;">${value}</td>
  </tr>`;
}

// ─── EMAIL: New Job Created ───────────────────────────────────────────────────
export async function sendJobCreatedEmail(job) {
  const reportedOn = new Date(job.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "long", timeStyle: "short" });
  const locationStr = job.location?.address || `${job.location?.lat?.toFixed(5)}, ${job.location?.lng?.toFixed(5)}` || "Not specified";
  const imageSection = job.imageUrl
    ? `<div style="margin-top:20px;">
        <p style="color:#888;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">🖼️ Attached Evidence</p>
        <a href="${job.imageUrl}" target="_blank">
          <img src="${job.imageUrl}" alt="Issue Photo" style="width:100%;max-height:260px;object-fit:cover;border-radius:12px;border:1px solid #2a2a2a;"/>
        </a>
        <p style="color:#555;font-size:11px;margin:6px 0 0;text-align:center;">Click image to view full size</p>
      </div>`
    : "";

  const bodyHtml = `
    <p style="color:#e5e5e5;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Dear Authority,<br/><br/>
      A new civic issue has been reported in your jurisdiction through the <strong style="color:#3B82F6;">FixMyCity</strong> platform.
      Kindly review the details below and take necessary action.
    </p>

    <p style="color:#888;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">📍 Issue Details</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #2a2a2a;">
      ${row("Title", `<strong style="color:#fff;">${job.title}</strong>`)}
      ${row("Description", job.description || "—")}
      ${row("Category", job.category || "—")}
      ${row("Severity", severityBadge(job.severity))}
      ${row("Status", statusBadge(job.status))}
      ${row("Location", locationStr)}
      ${row("Reported On", reportedOn)}
    </table>

    ${imageSection}

    <div style="margin-top:28px;text-align:center;">
      <a href="http://localhost:8080" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#3B82F6,#6366F1);color:#fff;font-size:14px;font-weight:700;border-radius:12px;text-decoration:none;letter-spacing:0.3px;">
        View on Authority Dashboard →
      </a>
    </div>`;

  await transporter.sendMail({
    from: `"FixMyCity Platform" <${process.env.MAIL_FROM}>`,
    to: AUTHORITY_EMAIL,
    subject: `🚨 New Civic Issue Reported: ${job.title}`,
    html: baseTemplate({
      preheader: `New ${job.severity} severity issue reported — ${job.title}`,
      headerColor: SEVERITY_COLOR[job.severity] || "#3B82F6",
      headerIcon: "🏙️",
      headerTitle: "New Issue Reported",
      bodyHtml,
    }),
  });
}

// ─── EMAIL: Job Assigned to Contractor ───────────────────────────────────────
export async function sendJobAssignedEmail(job, contractorName) {
  const locationStr = job.location?.address || `${job.location?.lat?.toFixed(5)}, ${job.location?.lng?.toFixed(5)}` || "Not specified";

  const bodyHtml = `
    <p style="color:#e5e5e5;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Dear Authority,<br/><br/>
      A civic issue has been <strong style="color:#8B5CF6;">assigned to a contractor</strong> and is now in progress.
    </p>

    <p style="color:#888;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">📋 Assignment Details</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #2a2a2a;">
      ${row("Job Title", `<strong style="color:#fff;">${job.title}</strong>`)}
      ${row("Category", job.category || "—")}
      ${row("Severity", severityBadge(job.severity))}
      ${row("Status", statusBadge("ASSIGNED"))}
      ${row("Assigned To", `<strong style="color:#8B5CF6;">${contractorName}</strong>`)}
      ${row("Location", locationStr)}
    </table>

    <div style="margin-top:28px;text-align:center;">
      <a href="http://localhost:8080" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#8B5CF6,#6366F1);color:#fff;font-size:14px;font-weight:700;border-radius:12px;text-decoration:none;">
        Track on Dashboard →
      </a>
    </div>`;

  await transporter.sendMail({
    from: `"FixMyCity Platform" <${process.env.MAIL_FROM}>`,
    to: AUTHORITY_EMAIL,
    subject: `✅ Job Assigned: ${job.title}`,
    html: baseTemplate({
      preheader: `Job assigned to ${contractorName} — ${job.title}`,
      headerColor: "#8B5CF6",
      headerIcon: "👷",
      headerTitle: "Job Assigned to Contractor",
      bodyHtml,
    }),
  });
}

// ─── EMAIL: Job Completed ─────────────────────────────────────────────────────
export async function sendJobCompletedEmail(job) {
  const completedOn = job.completedAt
    ? new Date(job.completedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "long", timeStyle: "short" })
    : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "long", timeStyle: "short" });

  const locationStr = job.location?.address || `${job.location?.lat?.toFixed(5)}, ${job.location?.lng?.toFixed(5)}` || "Not specified";
  const completionLocStr = job.completionLocation
    ? `${job.completionLocation.lat.toFixed(5)}, ${job.completionLocation.lng.toFixed(5)}`
    : "Not captured";

  const proofSection = job.completionImage
    ? `<div style="margin-top:20px;">
        <p style="color:#888;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;">🖼️ Completion Proof</p>
        <a href="${job.completionImage}" target="_blank">
          <img src="${job.completionImage}" alt="Completion Proof" style="width:100%;max-height:260px;object-fit:cover;border-radius:12px;border:1px solid #2a2a2a;"/>
        </a>
      </div>`
    : "";

  const verifiedBadge = job.isVerifiedCompletion
    ? `<span style="display:inline-block;padding:3px 12px;border-radius:999px;background:#10B98122;color:#10B981;font-size:12px;font-weight:700;border:1px solid #10B98144;">✅ Verified</span>`
    : `<span style="display:inline-block;padding:3px 12px;border-radius:999px;background:#F59E0B22;color:#F59E0B;font-size:12px;font-weight:700;border:1px solid #F59E0B44;">⏳ Pending Review</span>`;

  const bodyHtml = `
    <p style="color:#e5e5e5;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Dear Authority,<br/><br/>
      Great news! A civic issue has been <strong style="color:#10B981;">marked as completed</strong> by the assigned contractor.
      Please review the completion proof and verify the work.
    </p>

    <p style="color:#888;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">✅ Completion Details</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #2a2a2a;">
      ${row("Job Title", `<strong style="color:#fff;">${job.title}</strong>`)}
      ${row("Category", job.category || "—")}
      ${row("Severity", severityBadge(job.severity))}
      ${row("Status", statusBadge("COMPLETED"))}
      ${row("Issue Location", locationStr)}
      ${row("Completion GPS", completionLocStr)}
      ${row("Completed On", completedOn)}
      ${row("Verification", verifiedBadge)}
    </table>

    ${proofSection}

    <div style="margin-top:28px;text-align:center;">
      <a href="http://localhost:8080" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#10B981,#059669);color:#fff;font-size:14px;font-weight:700;border-radius:12px;text-decoration:none;">
        Review Completion →
      </a>
    </div>`;

  await transporter.sendMail({
    from: `"FixMyCity Platform" <${process.env.MAIL_FROM}>`,
    to: AUTHORITY_EMAIL,
    subject: `🎉 Job Completed: ${job.title}`,
    html: baseTemplate({
      preheader: `Issue resolved — ${job.title} has been marked complete`,
      headerColor: "#10B981",
      headerIcon: "✅",
      headerTitle: "Issue Resolved",
      bodyHtml,
    }),
  });
}
