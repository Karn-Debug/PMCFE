import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Download,
  ArrowUpRight,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  MessageSquare,
  Paperclip,
  Flag,
  FolderOpen,
  Archive,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { modules } from "./config";
import {
  useRecords,
  useProjects,
  api,
  json,
  date,
  money,
  exportCsv,
} from "./api";
import type { Row, DashboardData } from "./types";
import {
  PageHead,
  Button,
  Badge,
  Avatar,
  Loading,
  ErrorState,
  Empty,
  Progress,
} from "./ui";
import { useAuth } from "./auth-context";
import { statusTone } from "./status";
import { cleanHtml } from "./RichTextEditor";
import { RecordForm, payload } from "./RecordForm";
import { RecordDetail } from "./RecordDetail";
export function ResourcePage({
  module,
  projectId,
  embedded = false,
  category,
  pageTitle,
}: {
  module: string;
  projectId?: string;
  embedded?: boolean;
  category?: string;
  pageTitle?: string;
}) {
  const config = {
      ...modules[module],
      ...(pageTitle
        ? {
            title: pageTitle,
            singular:
              category === "Legal draft" ? "Draft" : modules[module].singular,
          }
        : {}),
    },
    auth = useAuth(),
    client = useQueryClient(),
    projects = useProjects(),
    [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [project, setProject] = useState(projectId || ""),
    [page, setPage] = useState(1),
    [view, setView] = useState(
      module === "tasks"
        ? "board"
        : ["documents", "templates", "developers"].includes(module)
          ? "grid"
          : "list",
    ),
    [create, setCreate] = useState(false),
    [editing, setEditing] = useState<Row | null>(null),
    [archived, setArchived] = useState(false);
  const filters = {
    q: search,
    ...(category ? { category } : {}),
    status,
    projectId: project,
    page: String(page),
    limit: view === "board" ? "500" : "12",
    archived: String(archived),
  };
  const q = useRecords(module, filters);
  const dash = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardData>("/dashboard"),
  });
  const rows = q.data?.items || [],
    selected = params.get("record");
  const canManage = ["OWNER", "MANAGER"].includes(auth.user.role),
    canWrite =
      auth.user.role !== "VIEWER" &&
      (![
        "invoices",
        "work-orders",
        "quotes",
        "tenders",
        "templates",
        "developers",
        "schemes",
      ].includes(module) ||
        canManage);
  useEffect(() => setPage(1), [search, status, project, archived, view]);
  const select = (id: string | null) => {
    const p = new URLSearchParams(params);
    if (id) p.set("record", id);
    else p.delete("record");
    setParams(p);
  };
  const openRows =
    dash.data?.records.filter(
      (r) =>
        r.kind ===
          {
            tenders: "TENDER",
            quotes: "QUOTE",
            "work-orders": "WORK_ORDER",
            invoices: "INVOICE",
            permissions: "PERMISSION",
            tasks: "TASK",
            topics: "TOPIC",
            documents: "DOCUMENT",
            templates: "TEMPLATE",
            feasibility: "FEASIBILITY",
            meetings: "MEETING",
            progress: "PROGRESS",
            developers: "DEVELOPER",
            schemes: "SCHEME",
          }[module as "tenders"] &&
        (!projectId || r.projectId === projectId) &&
        (!category || r.data.category === category),
    ) || [];
  const stats =
    module === "invoices"
      ? [
          [
            "Total billed",
            money(
              openRows
                .filter((r) => !["Draft", "Cancelled"].includes(r.status))
                .reduce((n, r) => n + Number(r.total), 0),
            ),
          ],
          [
            "Payments received",
            money(openRows.reduce((n, r) => n + Number(r.paid), 0)),
          ],
          [
            "Outstanding",
            money(
              openRows
                .filter((r) => !["Draft", "Cancelled"].includes(r.status))
                .reduce((n, r) => n + Number(r.total) - Number(r.paid), 0),
            ),
          ],
        ]
      : config.statuses
          .slice(0, 4)
          .map((s) => [
            s,
            String(openRows.filter((r) => r.status === s).length),
          ]);
  const exportRows = () =>
    exportCsv(
      module + "-page-" + page + ".csv",
      rows.map((r) => ({
        Title: r.title,
        Reference: r.reference,
        Project: r.project?.name,
        Status: r.status,
        Assignee: r.assignee?.name,
        Due: date(r.dueDate),
        Amount: r.total,
        Paid: r.paid,
        Notes: r.content,
      })),
    );
  async function changeStatus(r: Row, next: string) {
    try {
      await api("/records/" + module + "/" + r.id, {
        method: "PUT",
        headers: { "If-Match": String(r.version) },
        body: json({ ...payload(r), status: next }),
      });
      client.invalidateQueries();
      toast.success("Status updated");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  return (
    <div className={embedded ? "embedded-resource" : ""}>
      {!embedded ? (
        <PageHead
          eyebrow="YOUR CONNECTED WORKSPACE"
          title={config.title}
          description={config.description}
          actions={
            <>
              <Button
                variant="secondary"
                onClick={exportRows}
                disabled={!rows.length}
              >
                <Download size={16} />
                Export page
              </Button>
              {canWrite && (
                <Button onClick={() => setCreate(true)}>
                  <Plus size={17} />
                  {module === "tasks"
                    ? "New task"
                    : "New " + config.singular.toLowerCase()}
                </Button>
              )}
            </>
          }
        />
      ) : (
        <div className="embedded-heading">
          <div>
            <h2>{config.title}</h2>
            <p>{config.description}</p>
          </div>
          {canWrite && (
            <Button onClick={() => setCreate(true)}>
              <Plus size={16} />
              Add {config.singular.toLowerCase()}
            </Button>
          )}
        </div>
      )}
      {["invoices", "work-orders"].includes(module) && (
        <div className="secondary-tabs">
          <Link
            className={module === "invoices" ? "active" : ""}
            to="/invoices"
          >
            Invoices & payments
          </Link>
          <Link
            className={module === "work-orders" ? "active" : ""}
            to="/work-orders"
          >
            Work orders
          </Link>
        </div>
      )}
      {["tenders", "quotes"].includes(module) && (
        <div className="secondary-tabs">
          <Link className={module === "tenders" ? "active" : ""} to="/tenders">
            Tender register
          </Link>
          <Link className={module === "quotes" ? "active" : ""} to="/quotes">
            All quotations
          </Link>
        </div>
      )}
      {module === "permissions" && (
        <Link className="text-link setup-link" to="/schemes">
          Manage approval checklists <ArrowUpRight size={14} />
        </Link>
      )}
      {module === "tasks" && (
        <Link className="text-link setup-link" to="/topics">
          Manage topics <ArrowUpRight size={14} />
        </Link>
      )}
      <div className="resource-stats">
        {stats.map(([label, value]) => (
          <div
            key={label}
            data-tone={
              Number(String(value).replace(/[^0-9.-]/g, "")) > 0
                ? statusTone(label)
                : "neutral"
            }
          >
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="panel resource-panel">
        <div className="resource-toolbar">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label={"Search " + config.title}
              placeholder={"Search " + config.title.toLowerCase() + "…"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {config.statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {config.project && !projectId && (
            <select
              aria-label="Filter by project"
              value={project}
              onChange={(e) => setProject(e.target.value)}
            >
              <option value="">All projects</option>
              {projects.data?.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <div className="toolbar-spacer" />
          <button
            className={"icon-btn " + (archived ? "active" : "")}
            title={archived ? "Show active records" : "Show archived records"}
            aria-label={
              archived ? "Show active records" : "Show archived records"
            }
            onClick={() => setArchived(!archived)}
          >
            <Archive size={17} />
          </button>
          <div className="view-toggle">
            <button
              className={view === "list" ? "active" : ""}
              aria-label="List view"
              onClick={() => setView("list")}
            >
              <List size={17} />
            </button>
            <button
              className={view !== "list" ? "active" : ""}
              aria-label={module === "tasks" ? "Board view" : "Grid view"}
              onClick={() => setView(module === "tasks" ? "board" : "grid")}
            >
              <LayoutGrid size={17} />
            </button>
          </div>
        </div>
        {archived && (
          <div className="info-note archive-note">
            Archived records are retained. Use Restore to return them to the
            workspace.
          </div>
        )}
        {q.isLoading ? (
          <Loading />
        ) : q.error ? (
          <ErrorState error={q.error} retry={() => q.refetch()} />
        ) : !rows.length ? (
          <Empty
            title={
              search || status
                ? "No matching records"
                : "A fresh page for your " + config.title.toLowerCase()
            }
            text={
              search || status
                ? "Try changing your search or filters."
                : "Create your first " +
                  config.singular.toLowerCase() +
                  " to get started."
            }
            action={
              canWrite && !archived ? (
                <Button onClick={() => setCreate(true)}>
                  <Plus size={16} />
                  Create {config.singular.toLowerCase()}
                </Button>
              ) : undefined
            }
          />
        ) : view === "board" && !archived ? (
          <div className="kanban">
            {config.statuses.map((s) => (
              <section
                className="kanban-column"
                data-tone={statusTone(s)}
                key={s}
              >
                <div className="kanban-heading">
                  <span>
                    <i className={"kanban-dot " + s.replaceAll(" ", "-")} />
                    {s}
                  </span>
                  <b>{rows.filter((r) => r.status === s).length}</b>
                </div>
                {rows
                  .filter((r) => r.status === s)
                  .map((r) => (
                    <article
                      className="task-card"
                      data-status={r.status}
                      key={r.id}
                    >
                      <div className="flex-between">
                        <span className="topic-tag">
                          {r.data.topic || "General"}
                        </span>
                        {r.priority === "High" || r.priority === "Urgent" ? (
                          <span
                            className={
                              r.priority === "Urgent"
                                ? "red-text"
                                : "amber-text"
                            }
                            title={r.priority + " priority"}
                          >
                            <Flag
                              size={15}
                              aria-label={r.priority + " priority"}
                            />
                          </span>
                        ) : (
                          <span />
                        )}
                      </div>
                      <button
                        className="task-title"
                        onClick={() => select(r.id)}
                      >
                        {r.title}
                      </button>
                      <small className="muted">
                        {r.project?.name || "Workspace"}
                      </small>
                      <div className="task-card-footer">
                        <span>
                          <CalendarDays size={13} />
                          {date(r.dueDate).replace(" 2026", "")}
                        </span>
                        <Avatar
                          size="small"
                          name={r.assignee?.name || "Unassigned"}
                        />
                      </div>
                      {canWrite && (
                        <select
                          aria-label={"Status for " + r.title}
                          value={r.status}
                          onChange={(e) => changeStatus(r, e.target.value)}
                        >
                          {config.statuses.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      )}
                    </article>
                  ))}
                {canWrite && (
                  <button
                    className="kanban-add"
                    onClick={() => setCreate(true)}
                  >
                    <Plus size={15} />
                    Add task
                  </button>
                )}
              </section>
            ))}
          </div>
        ) : view === "grid" && !archived ? (
          <div className="record-grid">
            {rows.map((r) => (
              <button
                className="record-tile"
                key={r.id}
                onClick={() => select(r.id)}
              >
                <div className="flex-between">
                  <span className="tile-icon">
                    <config.icon size={23} />
                  </span>
                  <ArrowUpRight size={17} />
                </div>
                <span className="tile-category">
                  {r.data.category ||
                    r.data.type ||
                    r.project?.name ||
                    config.singular}
                </span>
                <h3>{r.title}</h3>
                <p>
                  {(r.data.format === "html"
                    ? cleanHtml(r.content)
                        .replace(/<[^>]+>/g, " ")
                        .slice(0, 90)
                    : r.content?.slice(0, 90)) ||
                    r.data.email ||
                    r.data.documents ||
                    "Open to view details and attachments."}
                </p>
                <div className="tile-footer">
                  <Badge status={r.status} />
                  <span>{r.files?.length || 0} files</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{config.singular.toUpperCase()}</th>
                  {config.project && <th>PROJECT</th>}
                  <th>STATUS</th>
                  {["invoices", "work-orders", "quotes"].includes(module) ? (
                    <>
                      <th>VALUE</th>
                      <th>{module === "invoices" ? "BALANCE" : "REFERENCE"}</th>
                    </>
                  ) : (
                    <>
                      <th>
                        {module === "developers" ? "CONTACT" : "OWNER / TYPE"}
                      </th>
                      <th>{module === "developers" ? "EMAIL" : "DUE DATE"}</th>
                    </>
                  )}
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <button
                        className="table-title"
                        onClick={() => !archived && select(r.id)}
                      >
                        <span className="table-record-icon">
                          <config.icon size={17} />
                        </span>
                        <span>
                          <b>{r.title}</b>
                          <small>
                            {r.reference ||
                              r.data.category ||
                              r.data.topic ||
                              config.singular}
                          </small>
                        </span>
                      </button>
                    </td>
                    {config.project && (
                      <td>
                        <span className="project-tag">
                          {r.project?.name || "Workspace"}
                        </span>
                      </td>
                    )}
                    <td>
                      <Badge status={r.status} />
                    </td>
                    {["invoices", "work-orders", "quotes"].includes(module) ? (
                      <>
                        <td className="money-cell">{money(r.total)}</td>
                        <td>
                          {module === "invoices"
                            ? money(Number(r.total) - Number(r.paid))
                            : r.reference || "—"}
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          {module === "developers" ? (
                            r.data.contact || "—"
                          ) : (
                            <span className="owner-cell">
                              {r.assignee && (
                                <Avatar size="small" name={r.assignee.name} />
                              )}{" "}
                              {r.assignee?.name || r.data.type || "Unassigned"}
                            </span>
                          )}
                        </td>
                        <td>
                          {module === "developers"
                            ? r.data.email || "—"
                            : date(r.dueDate)}
                        </td>
                      </>
                    )}
                    <td>
                      {archived ? (
                        canManage && (
                          <Button
                            variant="ghost"
                            onClick={async () => {
                              try {
                                await api(
                                  "/records/" +
                                    module +
                                    "/" +
                                    r.id +
                                    "/restore",
                                  { method: "POST" },
                                );
                                client.invalidateQueries();
                                toast.success("Record restored");
                              } catch (e) {
                                toast.error((e as Error).message);
                              }
                            }}
                          >
                            <RotateCcw size={14} />
                            Restore
                          </Button>
                        )
                      ) : (
                        <button
                          className="icon-btn"
                          aria-label={"View " + r.title}
                          onClick={() => select(r.id)}
                        >
                          <ArrowUpRight size={17} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="table-footer">
          <span>
            {q.data?.total || 0} records
            {view === "board" && Number(q.data?.total) > 500
              ? " · first 500 shown; narrow filters"
              : ""}
          </span>
          {view !== "board" && (
            <div>
              <span>
                Page {page} of{" "}
                {Math.max(1, Math.ceil((q.data?.total || 0) / 12))}
              </span>
              <button
                className="icon-btn"
                aria-label="Previous page"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="icon-btn"
                aria-label="Next page"
                disabled={page * 12 >= (q.data?.total || 0)}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
      {create && (
        <RecordForm
          module={module}
          fixedCategory={category}
          projectId={projectId}
          onClose={() => setCreate(false)}
          onSaved={(id) => select(id)}
        />
      )}{" "}
      {editing && (
        <RecordForm
          module={module}
          fixedCategory={category}
          record={editing}
          onClose={() => setEditing(null)}
        />
      )}{" "}
      {selected && !editing && !archived && (
        <RecordDetail
          module={module}
          id={selected}
          onClose={() => select(null)}
          onEdit={canWrite ? (r) => setEditing(r) : undefined}
        />
      )}
    </div>
  );
}
