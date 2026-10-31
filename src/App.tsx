import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Routes,
  Route,
  NavLink,
  Link,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Search,
  ChevronDown,
  ChevronRight,
  Menu,
  LogOut,
  ArrowRight,
  ArrowUpRight,
  Command,
  Building2,
  ShieldCheck,
  LifeBuoy,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, json, ApiError } from "./api";
import type { Session, DashboardData } from "./types";
import { navigation, setupNavigation, modules, kindToModule } from "./config";
import { Avatar, Architecture, Button, Loading, ErrorState, Modal } from "./ui";
import { Dashboard } from "./Dashboard";
import { Projects, ProjectDetail } from "./Projects";
import { ResourcePage } from "./Resources";
import { Settings } from "./Settings";
import { Portal } from "./Portal";
import { LegacyNavigation, routeLabels } from "./Navigation";
import { TemplatePage } from "./Templates";
import { TenderFormPage } from "./TenderForm";
import { AuthContext, useAuth } from "./auth-context";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/portal/:token" element={<Portal />} />
      <Route element={<Protected />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="settings" element={<Settings />} />
          <Route path="tender-form" element={<TenderFormPage />} />
          <Route path="pmc-tender-setup-form" element={<TenderFormPage />} />
          <Route
            path="templates"
            element={<Navigate to="/templates/workorder" replace />}
          />
          <Route
            path="templates/workorder"
            element={<TemplatePage key="workorder" kind="workorder" />}
          />
          <Route
            path="templates/demand"
            element={<TemplatePage key="demand" kind="demand" />}
          />
          <Route
            path="templates/terms"
            element={<TemplatePage key="terms" kind="terms" />}
          />
          <Route
            path="document-drafts"
            element={
              <ResourcePage
                module="templates"
                category="Legal draft"
                pageTitle="Document Drafts"
              />
            }
          />
          <Route
            path="letterhead"
            element={<TemplatePage key="letterhead" kind="letterhead" />}
          />
          <Route path=":module" element={<ModuleRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
function ModuleRoute() {
  const { module = "" } = useParams();
  return modules[module] ? (
    <ResourcePage key={module} module={module} />
  ) : (
    <Navigate to="/" replace />
  );
}
function Protected() {
  const q = useQuery({
    queryKey: ["session"],
    queryFn: () => api<Session>("/auth/me"),
    retry: false,
  });
  if (q.isLoading) return <Loading />;
  if (q.error instanceof ApiError && q.error.status === 401)
    return <Navigate to="/login" replace />;
  if (q.error) return <ErrorState error={q.error} retry={() => q.refetch()} />;
  return (
    <AuthContext.Provider value={q.data!}>
      <Outlet />
    </AuthContext.Provider>
  );
}
function Login() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const navigate = useNavigate(),
    client = useQueryClient();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/auth/login", {
        method: "POST",
        body: json({ email, password }),
      });
      await client.invalidateQueries({ queryKey: ["session"] });
      navigate("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-story">
        <Logo />
        <div className="login-message">
          <span className="eyebrow">BUILT FOR THE BIGGER PICTURE</span>
          <h1>
            Every project.
            <br />
            One clear
            <br />
            <em>perspective.</em>
          </h1>
          <p>
            Bring your people, plans, and progress together.
            <br />A considered workspace for better-built places.
          </p>
        </div>
        <Architecture />
        <div className="login-footer">
          <span>PROJECT MANAGEMENT CONSULTANCY</span>
          <span>STALLION / PMC</span>
        </div>
      </div>
      <div className="login-form-wrap">
        <div className="login-form">
          <span className="eyebrow">YOUR WORKSPACE AWAITS</span>
          <h2>Welcome back.</h2>
          <p>Sign in to keep your projects moving.</p>
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                autoComplete="username"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </label>
            <label>
              Password
              <input
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </label>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <Button disabled={busy} type="submit">
              {busy ? "Signing in…" : "Sign in to workspace"}
              <ArrowRight size={17} />
            </Button>
          </form>
          {import.meta.env.DEV && (
            <div className="local-login">
              <ShieldCheck size={18} />
              <div>
                <b>Local review workspace</b>
                <p>Use the account created in your backend configuration.</p>
                <button
                  onClick={() => {
                    setEmail("owner@stallion.local");
                    setPassword("StallionLocal!2026");
                  }}
                >
                  Fill local demo credentials <ArrowUpRight size={13} />
                </button>
              </div>
            </div>
          )}
          <small className="login-help">
            Need access? Contact your workspace owner.
          </small>
        </div>
        <span className="login-bottom">
          Built with clarity. Made for your team.
        </span>
      </div>
    </div>
  );
}
function Logo() {
  return (
    <div className="brand">
      <img
        className="brand-logo"
        src="/stallion-logo.png"
        alt="Stallion"
        width={128}
        height={75}
      />
    </div>
  );
}
function Layout() {
  const auth = useAuth(),
    location = useLocation(),
    navigate = useNavigate(),
    client = useQueryClient();
  const [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(false),
    [term, setTerm] = useState(""),
    [inbox, setInbox] = useState(false),
    [help, setHelp] = useState(false);
  const q = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardData>("/dashboard"),
  });
  useEffect(() => {
    setMobile(false);
    setInbox(false);
  }, [location.pathname]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  const label =
    routeLabels[location.pathname] ||
    [...navigation, ...setupNavigation].find(
      (n) => n.path === location.pathname,
    )?.label ||
    (location.pathname.startsWith("/projects/")
      ? "Project workspace"
      : modules[location.pathname.slice(1)]?.title) ||
    "Workspace";
  const alerts = (q.data?.records || []).filter(
    (r) =>
      (r.kind === "PERMISSION" && r.data.flagged) ||
      (r.dueDate &&
        new Date(r.dueDate) < new Date() &&
        !["Completed", "Paid", "Issued", "Closed", "Cancelled"].includes(
          r.status,
        )),
  );
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={"sidebar " + (mobile ? "sidebar-open" : "")}>
        <Link to="/" className="brand-link">
          <Logo />
        </Link>
        <button
          className="workspace-switch"
          onClick={() => navigate("/settings")}
        >
          <span className="workspace-logo">AF</span>
          <span>
            <b>{auth.organization.name}</b>
            <small>PMC workspace</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <LegacyNavigation />
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">
              <LifeBuoy size={18} />
            </span>
            <b>A little guidance?</b>
            <p>Your workspace, explained.</p>
            <button onClick={() => setHelp(true)}>
              Open quick guide <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="sidebar-profile">
            <Avatar name={auth.user.name} />
            <div>
              <b>{auth.user.name}</b>
              <small>{auth.user.role.toLowerCase()}</small>
            </div>
            <button
              aria-label="Sign out"
              className="icon-btn"
              onClick={async () => {
                await api("/auth/logout", { method: "POST" });
                client.clear();
                navigate("/login");
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-btn mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <b>{label}</b>
          </div>
          <div className="topbar-tools">
            <button className="search-trigger" onClick={() => setSearch(true)}>
              <Search size={16} />
              <span>Search workspace</span>
              <kbd>Ctrl K</kbd>
            </button>
            <span className="topbar-divider" />
            <button
              className="icon-btn notification-button"
              aria-label="Open notifications"
              onClick={() => setInbox(!inbox)}
            >
              <Bell size={19} />
              {alerts.length > 0 && <i />}
            </button>
            <Avatar name={auth.user.name} />
          </div>
          {inbox && (
            <div className="notification-popover">
              <h3>
                Needs your attention <span>{alerts.length}</span>
              </h3>
              {alerts.length ? (
                alerts.slice(0, 8).map((r) => (
                  <button
                    key={r.id}
                    onClick={() =>
                      navigate("/" + kindToModule[r.kind] + "?record=" + r.id)
                    }
                  >
                    <span>{r.title}</span>
                    <small>
                      {r.project?.name || "Workspace"} · {r.status}
                    </small>
                  </button>
                ))
              ) : (
                <p>You're all caught up. No flagged or overdue items.</p>
              )}
            </div>
          )}
        </header>
        <main>
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>
            Stallion PMC <i /> {auth.organization.name}
          </span>
          <span>
            {auth.organization.isDemo
              ? "LOCAL DEMO · Sample records"
              : "PRIVATE WORKSPACE"}
            <span className="status-dot" />
          </span>
        </footer>
      </div>
      {search && (
        <Modal
          title="Search your workspace"
          description="Find projects, tasks, documents, and more."
          onClose={() => setSearch(false)}
        >
          <div className="modal-body">
            <div className="search-input">
              <Search size={18} />
              <input
                autoFocus
                placeholder="Type a project or record name…"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>
            <div className="search-results">
              {q.data?.projects
                .filter((p) =>
                  p.name.toLowerCase().includes(term.toLowerCase()),
                )
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      navigate("/projects/" + p.id);
                      setSearch(false);
                    }}
                  >
                    <Building2 size={18} />
                    <span>
                      <b>{p.name}</b>
                      <small>Project · {p.location}</small>
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              {q.data?.records
                .filter((r) =>
                  r.title.toLowerCase().includes(term.toLowerCase()),
                )
                .slice(0, 12)
                .map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      navigate("/" + kindToModule[r.kind] + "?record=" + r.id);
                      setSearch(false);
                    }}
                  >
                    <Search size={17} />
                    <span>
                      <b>{r.title}</b>
                      <small>
                        {modules[kindToModule[r.kind]]?.singular} · {r.status}
                      </small>
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
            </div>
          </div>
        </Modal>
      )}
      {help && (
        <Modal
          title="A place for every part of your project"
          onClose={() => setHelp(false)}
        >
          <div className="modal-body guide">
            <p>
              <b>1. Start with a project.</b> Add your society, location,
              coordinator, timeline and current stage under Live projects.
            </p>
            <p>
              <b>2. Bring the work together.</b> Open a project to manage its
              tenders, approvals, fees, documents, meetings and site progress.
            </p>
            <p>
              <b>3. Make ownership clear.</b> Create topics and tasks in
              Teamspace. Assign a teammate and a due date.
            </p>
            <p>
              <b>4. Keep financial records accurate.</b> Issue an invoice, then
              record receipts against it. Balances are calculated automatically.
            </p>
            <p>
              <b>5. Reuse what works.</b> Build templates with project
              placeholders, import Word text, and print a project-specific copy.
            </p>
            <div className="info-note">
              The local demo contains sample data. Invitation links work only
              where this app is reachable. Email delivery and legacy data
              migration require your production services.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
