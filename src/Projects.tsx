import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MapPin,
  ArrowUpRight,
  Building2,
  CalendarDays,
  ArrowLeft,
  Pencil,
  Download,
  CheckCircle2,
  Users,
} from "lucide-react";
import { useProjects, api, json, date, exportCsv } from "./api";
import type { Project } from "./types";
import {
  PageHead,
  Button,
  Badge,
  Progress,
  Loading,
  ErrorState,
  Empty,
  Architecture,
  Modal,
  SectionTitle,
} from "./ui";
import { ResourcePage } from "./Resources";
import { useAuth } from "./auth-context";
export function Projects() {
  const auth = useAuth(),
    q = useProjects(),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All projects"),
    [create, setCreate] = useState(false);
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} retry={() => q.refetch()} />;
  const projects = q.data!.filter(
    (p) =>
      (p.name + " " + p.location)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "All projects" || p.status === filter),
  );
  return (
    <>
      <PageHead
        eyebrow="PLACES IN THE MAKING"
        title="Live projects"
        description="Every ambition has a home. Keep yours moving forward."
        actions={
          ["OWNER", "MANAGER"].includes(auth.user.role) && (
            <Button onClick={() => setCreate(true)}>
              <Plus size={17} />
              New project
            </Button>
          )
        }
      />
      <div className="toolbar">
        <div className="segmented">
          {["All projects", "Active", "On hold", "Completed"].map((s) => (
            <button
              className={filter === s ? "selected" : ""}
              onClick={() => setFilter(s)}
              key={s}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="search-input">
          <Search size={17} />
          <input
            aria-label="Search projects"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="project-grid">
        {projects.map((p, i) => (
          <Link to={"/projects/" + p.id} className="project-card" key={p.id}>
            <div className={"project-card-art art-" + i}>
              <Architecture variant={i} />
              <span className="project-code">{p.code}</span>
              <Badge status={p.status} />
            </div>
            <div className="project-card-body">
              <div className="flex-between">
                <h2>{p.name}</h2>
                <ArrowUpRight size={20} />
              </div>
              <p>
                <MapPin size={14} />
                {p.location}, {p.city}
              </p>
              <div className="project-stage-row">
                <span>{p.stage}</span>
                <small>Overall progress</small>
              </div>
              <Progress value={p.progress} />
              <div className="project-card-foot">
                <span>
                  <CalendarDays size={14} />
                  Target {date(p.targetDate)}
                </span>
                <span>
                  Open workspace <ArrowUpRight size={13} />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!projects.length && (
        <Empty
          title="No projects found"
          text="Try another search or create a project."
        />
      )}
      {create && <ProjectForm onClose={() => setCreate(false)} />}
    </>
  );
}
export function ProjectDetail() {
  const { id } = useParams(),
    q = useProjects(),
    [params, setParams] = useSearchParams(),
    [edit, setEdit] = useState(false);
  const auth = useAuth();
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} retry={() => q.refetch()} />;
  const project = q.data?.find((p) => p.id === id);
  if (!project) return <Empty title="Project not found" />;
  const tab = params.get("tab") || "overview";
  const tabs = [
    ["overview", "Overview"],
    ["feasibility", "Feasibility"],
    ["tenders", "Tenders"],
    ["invoices", "Fees & billing"],
    ["documents", "Documents"],
    ["meetings", "Society AGM"],
    ["permissions", "Permissions"],
    ["progress", "Construction"],
  ];
  return (
    <>
      <Link to="/projects" className="back-link">
        <ArrowLeft size={15} />
        All projects
      </Link>
      <PageHead
        eyebrow={project.code + " / PROJECT WORKSPACE"}
        title={project.name}
        description={
          project.location + ", " + project.city + " · " + project.society
        }
        actions={
          <>
            <Badge status={project.status} />
            {["OWNER", "MANAGER"].includes(auth.user.role) && (
              <Button variant="secondary" onClick={() => setEdit(true)}>
                <Pencil size={15} />
                Edit project
              </Button>
            )}
          </>
        }
      />
      <div className="project-tabs">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            className={key === tab ? "active" : ""}
            onClick={() => setParams({ tab: key })}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "overview" ? (
        <>
          <div className="project-overview-grid">
            <div className="panel project-story">
              <div className="project-overview-art">
                <Architecture />
              </div>
              <div className="panel-padding">
                <span className="eyebrow">THE PROJECT</span>
                <h2>A shared vision, taking shape.</h2>
                <p>
                  {project.description ||
                    "Add a project description to give your team the full picture."}
                </p>
                <div className="detail-grid">
                  <div>
                    <small>CURRENT STAGE</small>
                    <b>{project.stage}</b>
                  </div>
                  <div>
                    <small>TOWER</small>
                    <b>{project.tower || "—"}</b>
                  </div>
                  <div>
                    <small>START DATE</small>
                    <b>{date(project.startDate)}</b>
                  </div>
                  <div>
                    <small>TARGET HANDOVER</small>
                    <b>{date(project.targetDate)}</b>
                  </div>
                </div>
                <Progress value={project.progress} />
              </div>
            </div>
            <div className="project-overview-right">
              <div className="panel panel-padding">
                <h3>Every part, connected.</h3>
                <div className="module-links">
                  {tabs.slice(1).map(([key, label]) => (
                    <button key={key} onClick={() => setParams({ tab: key })}>
                      <span>{label}</span>
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="panel panel-padding">
                <h3>Site & coordination</h3>
                <p className="muted">
                  {project.address || project.location}
                  <br />
                  {project.city}, {project.state}
                </p>
                {project.coordinators.length ? (
                  project.coordinators.map((c, i) => (
                    <div className="coordinator" key={i}>
                      <Users size={17} />
                      <div>
                        <b>{c.name}</b>
                        <small>{c.mobile}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    Add a site coordinator in project details.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <ResourcePage key={tab} module={tab} projectId={id} embedded />
      )}
      {edit && <ProjectForm project={project} onClose={() => setEdit(false)} />}
    </>
  );
}
export function ProjectForm({
  project,
  onClose,
}: {
  project?: Project;
  onClose: () => void;
}) {
  const initial = {
    name: "",
    code: "",
    location: "",
    address: "",
    city: "Mumbai",
    state: "Maharashtra",
    society: "",
    tower: "",
    status: "Active",
    stage: "Planning",
    progress: 0,
    startDate: "",
    targetDate: "",
    description: "",
    coordinators: [] as { name: string; mobile: string }[],
  };
  const [form, setForm] = useState({
      ...initial,
      ...project,
      startDate: project?.startDate?.slice(0, 10) || "",
      targetDate: project?.targetDate?.slice(0, 10) || "",
    }),
    [error, setError] = useState("");
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const data: Record<string, unknown> = Object.fromEntries(
        Object.keys(initial).map((key) => [
          key,
          form[key as keyof typeof form],
        ]),
      );
      data.startDate = data.startDate || null;
      data.targetDate = data.targetDate || null;
      return api("/projects" + (project ? "/" + project.id : ""), {
        method: project ? "PUT" : "POST",
        headers: project ? { "If-Match": String(project.version) } : {},
        body: json(data),
      });
    },
    onSuccess: () => {
      client.invalidateQueries();
      toast.success(project ? "Project updated" : "Your new project is ready");
      onClose();
    },
    onError: (e) => setError(e.message),
  });
  const field = (
    key: keyof typeof initial,
    label: string,
    type = "text",
    required = false,
  ) => (
    <label key={key}>
      {label}
      {required && " *"}
      <input
        type={type}
        required={required}
        min={type === "number" ? 0 : undefined}
        max={key === "progress" ? 100 : undefined}
        value={String(form[key])}
        onChange={(e) =>
          setForm({
            ...form,
            [key]: type === "number" ? Number(e.target.value) : e.target.value,
          })
        }
      />
    </label>
  );
  return (
    <Modal
      title={project ? "Edit project" : "Start a new project"}
      description="Give your project a clear starting point."
      onClose={onClose}
      wide
    >
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="modal-body form-grid">
          {field("name", "Project name", "text", true)}
          {field("code", "Project code", "text", true)}
          {field("society", "Society name")}
          {field("tower", "Tower / building")}
          {field("location", "Area / locality", "text", true)}
          {field("city", "City")}
          {field("state", "State")}
          {field("address", "Site address")}
          {field("startDate", "Start date", "date")}
          {field("targetDate", "Target completion", "date")}
          <label>
            Stage
            <select
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value })}
            >
              {[
                "Planning",
                "Feasibility",
                "Tendering",
                "Approvals",
                "Construction",
                "Handover",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {["Active", "On hold", "Completed"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          {field("progress", "Overall progress (%)", "number")}
          <label className="full-width">
            Project brief
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <div className="full-width">
            <SectionTitle
              title="Site coordinators"
              action={
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setForm({
                      ...form,
                      coordinators: [
                        ...form.coordinators,
                        { name: "", mobile: "" },
                      ],
                    })
                  }
                >
                  <Plus size={14} />
                  Add coordinator
                </Button>
              }
            />
            {form.coordinators.map((c, i) => (
              <div className="coordinator-inputs" key={i}>
                <input
                  aria-label={"Coordinator " + (i + 1) + " name"}
                  placeholder="Name"
                  value={c.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      coordinators: form.coordinators.map((v, j) =>
                        j === i ? { ...v, name: e.target.value } : v,
                      ),
                    })
                  }
                />
                <input
                  aria-label={"Coordinator " + (i + 1) + " mobile"}
                  placeholder="Mobile number"
                  value={c.mobile}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      coordinators: form.coordinators.map((v, j) =>
                        j === i ? { ...v, mobile: e.target.value } : v,
                      ),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setForm({
                      ...form,
                      coordinators: form.coordinators.filter((_, j) => j !== i),
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          {error && (
            <div className="form-error full-width" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={mutation.isPending} type="submit">
            {mutation.isPending
              ? "Saving…"
              : project
                ? "Save changes"
                : "Create project"}
            <ArrowUpRight size={15} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
