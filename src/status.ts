export type StatusTone = "green" | "blue" | "amber" | "red" | "neutral";

// Exact labels keep drafts, inactive records, and partially paid invoices distinct.
const tones: Record<string, StatusTone> = {
  completed: "green",
  approved: "green",
  issued: "green",
  paid: "green",
  active: "green",
  accepted: "green",
  awarded: "green",
  uploaded: "green",
  "in progress": "blue",
  "in review": "blue",
  "under review": "blue",
  floated: "blue",
  applied: "blue",
  shortlisted: "blue",
  received: "blue",
  scheduled: "blue",
  pending: "amber",
  "on hold": "amber",
  "payment due": "amber",
  "part paid": "amber",
  "not applied": "amber",
  "document missing": "amber",
  high: "amber",
  rejected: "red",
  expired: "red",
  overdue: "red",
  urgent: "red",
};
export const statusTone = (status: string): StatusTone =>
  tones[status.trim().toLowerCase()] || "neutral";
