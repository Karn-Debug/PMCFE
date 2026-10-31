import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  FileSignature,
  ClipboardCheck,
  ReceiptText,
  ShieldCheck,
  Users,
  ChartNoAxesCombined,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  CircleDot,
  AlertCircle,
} from "lucide-react";
import { api, money, date } from "./api";
import type { DashboardData, Row, Project } from "./types";
import { PageHead, Loading, ErrorState, Modal, Badge, Empty } from "./ui";
type Detail = {
  id: string;
  name: string;
  secondary: string;
  status: string;
  href: string;
  amount?: string;
};
type Metric = {
  label: string;
  value: string | number;
  items: Detail[];
  hint?: string;
};
export function Dashboard() {
  const q = useQuery({
      queryKey: ["dashboard"],
      queryFn: () => api<DashboardData>("/dashboard"),
    }),
    [detail, setDetail] = useState<{ title: string; items: Detail[] } | null>(
      null,
    );
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} retry={() => q.refetch()} />;
  const d = q.data!,
    projects = d.projects,
    records = d.records;
  const byKind = (kind: string) => records.filter((r) => r.kind === kind);
  const tenders = byKind("TENDER"),
    quotes = byKind("QUOTE"),
    feasibility = byKind("FEASIBILITY"),
    workOrders = byKind("WORK_ORDER").filter((r) => r.status !== "Cancelled"),
    invoices = byKind("INVOICE").filter(
      (r) => !["Draft", "Cancelled"].includes(r.status),
    ),
    tasks = byKind("TASK"),
    permissions = byKind("PERMISSION");
  const row = (r: Row, module: string): Detail => ({
    id: r.id,
    name: r.title,
    secondary: r.project?.name || "Workspace",
    status: r.status,
    href: "/" + module + "?record=" + r.id,
    ...(["work-orders", "invoices"].includes(module)
      ? { amount: money(r.total) }
      : {}),
  });
  const project = (p: Project, tab?: string): Detail => ({
    id: p.id,
    name: p.name,
    secondary: p.location,
    status: p.status,
    href: "/projects/" + p.id + (tab ? "?tab=" + tab : ""),
  });
  const pRows = (list: Project[], tab?: string) =>
    list.map((p) => project(p, tab));
  const rRows = (list: Row[], module: string) =>
    list.map((r) => row(r, module));
  const uploaded = new Set(
    feasibility
      .filter((r) => r.files?.length && r.projectId)
      .map((r) => r.projectId),
  );
  const generated = new Set(
    workOrders.filter((r) => r.projectId).map((r) => r.projectId),
  );
  const overdue = invoices.filter(
    (r) =>
      r.dueDate &&
      new Date(r.dueDate) < new Date() &&
      Number(r.total) > Number(r.paid),
  );
  const groups: {
    title: string;
    icon: typeof FileSignature;
    path: string;
    metrics: Metric[];
  }[] = [
    {
      title: "Tenders",
      icon: FileSignature,
      path: "/tenders",
      metrics: [
        {
          label: "Total",
          value: tenders.length,
          items: rRows(tenders, "tenders"),
        },
        {
          label: "Floated",
          value: tenders.filter((r) => r.status === "Floated").length,
          items: rRows(
            tenders.filter((r) => r.status === "Floated"),
            "tenders",
          ),
        },
        {
          label: "Received",
          value: quotes.length,
          items: rRows(quotes, "quotes"),
          hint: "Developer quotations received",
        },
        {
          label: "Pending",
          value: tenders.filter(
            (t) =>
              !["Closed", "Awarded"].includes(t.status) &&
              !quotes.some((q) => q.parentId === t.id),
          ).length,
          items: rRows(
            tenders.filter(
              (t) =>
                !["Closed", "Awarded"].includes(t.status) &&
                !quotes.some((q) => q.parentId === t.id),
            ),
            "tenders",
          ),
          hint: "Open tenders without a quotation",
        },
      ],
    },
    {
      title: "Feasibility",
      icon: ChartNoAxesCombined,
      path: "/feasibility",
      metrics: [
        {
          label: "Total Project",
          value: projects.length,
          items: pRows(projects, "feasibility"),
        },
        {
          label: "Pending",
          value: projects.filter((p) => !uploaded.has(p.id)).length,
          items: pRows(
            projects.filter((p) => !uploaded.has(p.id)),
            "feasibility",
          ),
          hint: "Projects without an uploaded feasibility attachment",
        },
        {
          label: "Uploaded",
          value: projects.filter((p) => uploaded.has(p.id)).length,
          items: pRows(
            projects.filter((p) => uploaded.has(p.id)),
            "feasibility",
          ),
        },
      ],
    },
    {
      title: "Work Orders",
      icon: ClipboardCheck,
      path: "/work-orders",
      metrics: [
        {
          label: "Total Project",
          value: projects.length,
          items: pRows(projects, "invoices"),
        },
        {
          label: "WO Generated",
          value: projects.filter((p) => generated.has(p.id)).length,
          items: rRows(workOrders, "work-orders"),
          hint: "Projects with at least one work order",
        },
        {
          label: "Pending",
          value: projects.filter((p) => !generated.has(p.id)).length,
          items: pRows(
            projects.filter((p) => !generated.has(p.id)),
            "invoices",
          ),
        },
        {
          label: "Issued",
          value: workOrders.filter((r) => r.status === "Issued").length,
          items: rRows(
            workOrders.filter((r) => r.status === "Issued"),
            "work-orders",
          ),
        },
      ],
    },
    {
      title: "Fees/Billing",
      icon: ReceiptText,
      path: "/invoices",
      metrics: [
        {
          label: "Total Billing",
          value: money(d.billed),
          items: rRows(invoices, "invoices"),
        },
        {
          label: "Payment Received",
          value: money(d.paid),
          items: rRows(
            invoices.filter((r) => Number(r.paid) > 0),
            "invoices",
          ),
        },
        {
          label: "Balance",
          value: money(d.outstanding),
          items: rRows(
            invoices.filter((r) => Number(r.total) > Number(r.paid)),
            "invoices",
          ),
        },
        {
          label: "Overdue",
          value: money(
            overdue.reduce(
              (sum, r) => sum + Number(r.total) - Number(r.paid),
              0,
            ),
          ),
          items: rRows(overdue, "invoices"),
        },
      ],
    },
    {
      title: "Teamspace",
      icon: Users,
      path: "/tasks",
      metrics: [
        {
          label: "Total Topics",
          value: byKind("TOPIC").length,
          items: rRows(byKind("TOPIC"), "topics"),
        },
        {
          label: "Open Tasks",
          value: tasks.filter((r) => r.status === "Open").length,
          items: rRows(
            tasks.filter((r) => r.status === "Open"),
            "tasks",
          ),
        },
        {
          label: "In Process",
          value: tasks.filter((r) =>
            ["In progress", "In review"].includes(r.status),
          ).length,
          items: rRows(
            tasks.filter((r) =>
              ["In progress", "In review"].includes(r.status),
            ),
            "tasks",
          ),
        },
        {
          label: "Completed",
          value: tasks.filter((r) => r.status === "Completed").length,
          items: rRows(
            tasks.filter((r) => r.status === "Completed"),
            "tasks",
          ),
        },
      ],
    },
  ];
  const permissionMetrics = (stage: string): Metric[] => {
    const list = permissions.filter((r) => r.data.type === stage);
    const isExpired = (r: Row) =>
      r.status === "Expired" ||
      Boolean(
        r.data.expiry &&
          new Date(r.data.expiry) < new Date(new Date().toDateString()),
      );
    const pending = list.filter(
      (r) =>
        !isExpired(r) &&
        !["Issued", "Paid", "Expired", "Rejected"].includes(r.status),
    );
    const issued = list.filter(
      (r) => !isExpired(r) && ["Issued", "Paid"].includes(r.status),
    );
    const expired = list.filter(isExpired);
    return [
      {
        label: "Pending",
        value: pending.length,
        items: rRows(pending, "permissions"),
      },
      {
        label: "Issued",
        value: issued.length,
        items: rRows(issued, "permissions"),
      },
      {
        label: "Expired",
        value: expired.length,
        items: rRows(expired, "permissions"),
      },
    ];
  };
  const metricButton = (group: string, m: Metric) => {
    const hasValue = Number(String(m.value).replace(/[^0-9.-]/g, "")) > 0;
    const tone = !hasValue
      ? "neutral"
      : ["Overdue", "Expired"].includes(m.label)
        ? "red"
        : ["Pending", "Balance", "Open Tasks"].includes(m.label)
          ? "amber"
          : ["Issued", "Completed", "Uploaded", "Payment Received"].includes(
                m.label,
              )
            ? "green"
            : ["Floated", "Received", "WO Generated", "In Process"].includes(
                  m.label,
                )
              ? "blue"
              : "neutral";
    const Icon = {
      green: CheckCircle2,
      blue: CircleDot,
      amber: Clock3,
      red: AlertCircle,
      neutral: null,
    }[tone];
    return (
      <button
        className="dashboard-metric"
        data-tone={tone}
        key={m.label}
        title={m.hint || m.label}
        onClick={() =>
          setDetail({ title: group + " · " + m.label, items: m.items })
        }
      >
        <span>
          {Icon && <Icon size={13} aria-hidden="true" />}
          {m.label}
        </span>
        <strong>{m.value}</strong>
      </button>
    );
  };
  return (
    <>
      <PageHead
        eyebrow="WORKSPACE"
        title="Dashboard"
        description="Tenders, feasibility, work orders, fees, team activity, and permissions."
      />
      <div className="legacy-dashboard-grid">
        {groups.map((g) => (
          <section
            className={
              "panel dashboard-summary " +
              (g.title === "Fees/Billing" ? "billing-metrics" : "")
            }
            key={g.title}
          >
            <div className="dashboard-summary-title">
              <g.icon size={21} />
              <h2>{g.title}</h2>
              <Link aria-label={"Open " + g.title} to={g.path}>
                <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className={"dashboard-metrics metrics-" + g.metrics.length}>
              {g.metrics.map((m) => metricButton(g.title, m))}
            </div>
          </section>
        ))}
        <section className="panel dashboard-summary permission-summary">
          <div className="dashboard-summary-title">
            <ShieldCheck size={21} />
            <h2>Permissions</h2>
            <Link aria-label="Open permissions" to="/permissions">
              <ArrowUpRight size={18} />
            </Link>
          </div>
          {["IOD", "CC", "OC"].map((stage) => (
            <div className="permission-summary-row" key={stage}>
              <b>{stage}</b>
              <div className="dashboard-metrics metrics-3">
                {permissionMetrics(stage).map((m) => metricButton(stage, m))}
              </div>
            </div>
          ))}
        </section>
      </div>
      <div className="dashboard-quick-links">
        <Link to="/projects">
          Live Projects <ArrowUpRight size={16} />
        </Link>
        <Link to="/work-orders">
          Work Orders <ArrowUpRight size={16} />
        </Link>
        <Link to="/invoices">
          Fees/Billing <ArrowUpRight size={16} />
        </Link>
        <Link to="/permissions">
          Project Permissions <ArrowUpRight size={16} />
        </Link>
      </div>
      <p className="demo-footnote">
        Figures are calculated from saved records. {d.projects.length} projects
        · Updated {date(new Date().toISOString())}.{" "}
        {d.records.length > 0 && "Click a figure to view its details."}
      </p>
      {detail && (
        <Modal title={detail.title} onClose={() => setDetail(null)} wide>
          <div className="modal-body">
            {detail.items.length ? (
              <div className="dashboard-detail-list">
                {detail.items.map((r, i) => (
                  <Link
                    key={r.id + "-" + i}
                    to={r.href}
                    onClick={() => setDetail(null)}
                  >
                    <div>
                      <b>{r.name}</b>
                      <small>{r.secondary}</small>
                    </div>
                    <Badge status={r.status} />
                    {r.amount && <strong>{r.amount}</strong>}
                    <ArrowUpRight size={17} />
                  </Link>
                ))}
              </div>
            ) : (
              <Empty
                title="No matching records"
                text="This figure will update as records are added or changed."
              />
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
