import {
  LayoutDashboard,
  Building2,
  FileSignature,
  ReceiptText,
  ShieldCheck,
  FolderOpen,
  Users,
  Settings2,
  Landmark,
  FileText,
  Activity,
  ClipboardCheck,
  CalendarDays,
  ChartNoAxesCombined,
  NotebookPen,
} from "lucide-react";
export type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select" | "checkbox";
  options?: string[];
  required?: boolean;
  wide?: boolean;
  min?: number;
  max?: number;
};
export type ModuleConfig = {
  title: string;
  singular: string;
  description: string;
  icon: typeof Building2;
  statuses: string[];
  fields: Field[];
  defaults: Record<string, any>;
  project?: boolean;
};
const f = (
  key: string,
  label: string,
  type: Field["type"] = "text",
  options?: string[],
): Field => ({ key, label, type, options });
export const modules: Record<string, ModuleConfig> = {
  tenders: {
    title: "Tenders",
    singular: "Tender",
    description:
      "From invitation to evaluation. Every proposal in perspective.",
    icon: FileSignature,
    statuses: ["Draft", "Floated", "Under review", "Awarded", "Closed"],
    project: true,
    fields: [
      f("regulation", "Development regulation", "select", [
        "33(7) (A)/(B)",
        "33(8)",
        "33(9)",
        "33(11)",
        "33(20)(B)",
        "NMMC",
        "33(12) (A)/(B)",
        "33(19)",
      ]),
      f("units", "Unit types", "textarea"),
      f("terms", "Other terms of offer", "textarea"),
    ],
    defaults: { regulation: "33(9)", requirements: [], units: "", terms: "" },
  },
  quotes: {
    title: "Developer quotations",
    singular: "Quotation",
    description: "Compare the commitments that matter.",
    icon: ChartNoAxesCombined,
    statuses: ["Received", "Shortlisted", "Accepted", "Rejected"],
    project: true,
    fields: [
      f("developerName", "Developer company"),
      f("amount", "Proposal value (₹)", "number"),
      f("additionalArea", "Additional carpet area (%)", "number"),
      f("rent", "Monthly rent / sq. ft. (₹)", "number"),
      f("corpus", "Society corpus (₹)", "number"),
      f("completionMonths", "Completion period (months)", "number"),
    ],
    defaults: {
      developerName: "",
      amount: 0,
      additionalArea: 0,
      rent: 0,
      corpus: 0,
      completionMonths: 36,
    },
  },
  "work-orders": {
    title: "Work orders",
    singular: "Work order",
    description: "Clear scope, agreed fees, and accountable delivery.",
    icon: ClipboardCheck,
    statuses: ["Draft", "Approved", "Issued", "Cancelled"],
    project: true,
    fields: [
      f("developerName", "Developer / client"),
      f("tds", "TDS (%)", "number"),
      f("retention", "Retention (%)", "number"),
      f("terms", "Terms and conditions", "textarea"),
    ],
    defaults: {
      developerName: "",
      items: [{ description: "", quantity: 1, rate: 0, tax: 18 }],
      tds: 0,
      retention: 0,
      terms: "",
    },
  },
  invoices: {
    title: "Fees & billing",
    singular: "Invoice",
    description: "Know what is billed, what is collected, and what comes next.",
    icon: ReceiptText,
    statuses: ["Draft", "Issued", "Part paid", "Paid", "Cancelled"],
    project: true,
    fields: [
      f("developerName", "Bill to"),
      f("tds", "TDS (%)", "number"),
      f("retention", "Retention (%)", "number"),
      f("terms", "Payment terms", "textarea"),
    ],
    defaults: {
      developerName: "",
      items: [{ description: "", quantity: 1, rate: 0, tax: 18 }],
      tds: 0,
      retention: 0,
      terms: "",
    },
  },
  permissions: {
    title: "Permissions",
    singular: "Permission",
    description: "A clear path through approvals and statutory clearances.",
    icon: ShieldCheck,
    statuses: [
      "Not applied",
      "Pending",
      "Applied",
      "In progress",
      "Issued",
      "Payment due",
      "Rejected",
      "Document missing",
      "Paid",
      "Expired",
    ],
    project: true,
    fields: [
      f("type", "Approval stage", "select", [
        "IOD",
        "CC",
        "OC",
        "Unclassified",
      ]),
      f("scheme", "Regulation / scheme"),
      f("authority", "Issuing authority"),
      f("expiry", "Expiry date", "date"),
      f("flagged", "Flag for attention", "checkbox"),
      f("documents", "Required documents", "textarea"),
    ],
    defaults: {
      type: "IOD",
      scheme: "33(9)",
      authority: "",
      expiry: null,
      flagged: false,
      documents: "",
    },
  },
  tasks: {
    title: "Teamspace",
    singular: "Task",
    description: "One shared view of the work moving your projects forward.",
    icon: Users,
    statuses: ["Open", "In progress", "In review", "Completed"],
    project: true,
    fields: [f("topic", "Topic")],
    defaults: { topic: "General" },
  },
  topics: {
    title: "Topics",
    singular: "Topic",
    description: "Organize conversations around a shared purpose.",
    icon: NotebookPen,
    statuses: ["Active", "Closed"],
    fields: [],
    defaults: { members: [] },
  },
  documents: {
    title: "Document library",
    singular: "Document",
    description: "Project knowledge, organized and always within reach.",
    icon: FolderOpen,
    statuses: ["Draft", "In review", "Approved", "Archived"],
    project: true,
    fields: [
      f("category", "Category", "select", [
        "Legal",
        "Feasibility",
        "Drawing",
        "Society AGM",
        "Construction",
        "General",
      ]),
      f("revision", "Revision"),
    ],
    defaults: { category: "General", revision: "1" },
  },
  templates: {
    title: "Templates & drafts",
    singular: "Template",
    description: "Consistent documents. Built around the way you work.",
    icon: FileText,
    statuses: ["Active", "Draft"],
    fields: [
      f("category", "Template type", "select", [
        "Work order",
        "Invoice",
        "Terms & conditions",
        "Legal draft",
        "Letterhead",
        "Tender form",
      ]),
      f("header", "Letterhead header", "textarea"),
      f("footer", "Letterhead footer", "textarea"),
    ],
    defaults: {
      category: "Legal draft",
      header: "",
      footer: "",
      requirements: [],
    },
  },
  feasibility: {
    title: "Feasibility",
    singular: "Assessment",
    description:
      "Capture assumptions, evaluate scenarios, and organize reports.",
    icon: ChartNoAxesCombined,
    statuses: ["Pending", "In review", "Approved"],
    project: true,
    fields: [
      f("plotArea", "Plot area (sq. ft.)", "number"),
      f("fsi", "FSI assumption", "number"),
      f("saleRate", "Sale rate / sq. ft. (₹)", "number"),
      f("constructionRate", "Construction rate / sq. ft. (₹)", "number"),
      f("otherCost", "Other costs (₹)", "number"),
    ],
    defaults: {
      plotArea: 0,
      fsi: 1,
      saleRate: 0,
      constructionRate: 0,
      otherCost: 0,
    },
  },
  meetings: {
    title: "Society AGM",
    singular: "Meeting",
    description: "Keep decisions, minutes, and follow-ups together.",
    icon: CalendarDays,
    statuses: ["Scheduled", "Completed", "Cancelled"],
    project: true,
    fields: [
      f("location", "Meeting venue"),
      f("attendees", "Attendees", "textarea"),
      f("agenda", "Agenda", "textarea"),
      f("minutes", "Minutes & decisions", "textarea"),
    ],
    defaults: { location: "", attendees: "", agenda: "", minutes: "" },
  },
  progress: {
    title: "Construction progress",
    singular: "Milestone",
    description: "Track the milestones that turn plans into places.",
    icon: Activity,
    statuses: ["Planned", "In progress", "Completed", "On hold"],
    project: true,
    fields: [
      f("percent", "Completion (%)", "number"),
      f("videoUrl", "Site video URL"),
    ],
    defaults: { percent: 0, videoUrl: "" },
  },
  developers: {
    title: "Developer directory",
    singular: "Developer",
    description: "The partners behind your next chapter.",
    icon: Landmark,
    statuses: ["Active", "Inactive"],
    fields: [
      f("contact", "Contact person"),
      f("email", "Email address"),
      f("phone", "Phone number"),
      f("address", "Address", "textarea"),
    ],
    defaults: { contact: "", email: "", phone: "", address: "" },
  },
  schemes: {
    title: "Permission setup",
    singular: "Checklist",
    description: "Reusable approval requirements by scheme and stage.",
    icon: Settings2,
    statuses: ["Active", "Inactive"],
    fields: [
      f("type", "Approval stage", "select", [
        "IOD",
        "CC",
        "OC",
        "Unclassified",
      ]),
      f("scheme", "Regulation / scheme"),
      f("documents", "Document checklist", "textarea"),
    ],
    defaults: { type: "IOD", scheme: "33(9)", documents: "" },
  },
};
export const navigation = [
  { label: "Overview", path: "/", icon: LayoutDashboard },
  { label: "Live projects", path: "/projects", icon: Building2 },
  { label: "Tenders", path: "/tenders", icon: FileSignature },
  { label: "Fees & billing", path: "/invoices", icon: ReceiptText },
  { label: "Permissions", path: "/permissions", icon: ShieldCheck },
  { label: "Document library", path: "/documents", icon: FolderOpen },
  { label: "Teamspace", path: "/tasks", icon: Users },
];
export const setupNavigation = [
  { label: "Developers", path: "/developers", icon: Landmark },
  { label: "Templates & drafts", path: "/templates", icon: FileText },
  { label: "Profile & team", path: "/settings", icon: Settings2 },
];
export const kindToModule: Record<string, string> = {
  TENDER: "tenders",
  QUOTE: "quotes",
  WORK_ORDER: "work-orders",
  INVOICE: "invoices",
  PERMISSION: "permissions",
  TASK: "tasks",
  TOPIC: "topics",
  DOCUMENT: "documents",
  TEMPLATE: "templates",
  FEASIBILITY: "feasibility",
  MEETING: "meetings",
  PROGRESS: "progress",
  DEVELOPER: "developers",
  SCHEME: "schemes",
};
