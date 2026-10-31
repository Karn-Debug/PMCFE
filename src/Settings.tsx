import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Save,
  ShieldCheck,
  Building2,
  Users,
  Pencil,
} from "lucide-react";
import { useAuth } from "./auth-context";
import { api, json, useTeam } from "./api";
import type { User } from "./types";
import {
  PageHead,
  Button,
  Avatar,
  Badge,
  Modal,
  Loading,
  SectionTitle,
} from "./ui";
export function Settings() {
  const auth = useAuth(),
    client = useQueryClient(),
    team = useTeam(),
    [tab, setTab] = useState("company"),
    [form, setForm] = useState({
      name: auth.organization.name,
      profile: {
        email: "",
        phone: "",
        address: "",
        gstin: "",
        website: "",
        companySize: "",
        ...auth.organization.profile,
      },
    }),
    [busy, setBusy] = useState(false),
    [member, setMember] = useState<User | "new" | null>(null),
    [security, setSecurity] = useState(false);
  const manager = ["OWNER", "MANAGER"].includes(auth.user.role);
  return (
    <>
      <PageHead
        eyebrow="A WORKSPACE THAT FITS"
        title="Profile & team"
        description="Your company, your people, and the way you work together."
        actions={
          <Button variant="secondary" onClick={() => setSecurity(true)}>
            <ShieldCheck size={16} />
            Account security
          </Button>
        }
      />
      <div className="secondary-tabs">
        <button
          className={tab === "company" ? "active" : ""}
          onClick={() => setTab("company")}
        >
          <Building2 size={16} />
          Company profile
        </button>
        <button
          className={tab === "team" ? "active" : ""}
          onClick={() => setTab("team")}
        >
          <Users size={16} />
          Team & access
        </button>
      </div>
      {tab === "company" ? (
        <div className="settings-grid">
          <form
            className="panel panel-padding"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api("/organization", { method: "PUT", body: json(form) });
                client.invalidateQueries({ queryKey: ["session"] });
                toast.success("Company profile saved");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <SectionTitle
              title="Company details"
              sub="Used across your workspace and generated documents."
            />
            <div className="form-grid">
              <label className="full-width">
                Company name
                <input
                  required
                  minLength={2}
                  disabled={!manager}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              {[
                ["email", "Email address"],
                ["phone", "Phone number"],
                ["gstin", "GSTIN"],
                ["website", "Website"],
                ["companySize", "Company size"],
                ["address", "Company address"],
              ].map(([key, label]) => (
                <label
                  className={key === "address" ? "full-width" : ""}
                  key={key}
                >
                  {label}
                  <input
                    type={key === "email" ? "email" : "text"}
                    disabled={!manager}
                    value={form.profile[key as keyof typeof form.profile]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        profile: { ...form.profile, [key]: e.target.value },
                      })
                    }
                  />
                </label>
              ))}
            </div>
            {manager && (
              <div className="settings-save">
                <Button disabled={busy}>
                  <Save size={16} />
                  {busy ? "Saving…" : "Save company details"}
                </Button>
              </div>
            )}
          </form>
          <div>
            <div className="panel panel-padding account-card">
              <Avatar name={auth.user.name} />
              <h2>{auth.user.name}</h2>
              <p>{auth.user.email}</p>
              <Badge status={auth.user.role.toLowerCase()} />
              <hr />
              <div className="info-note">
                <ShieldCheck size={20} />
                <p>
                  Your session uses a private, HTTP-only cookie. Workspace
                  access is checked by the server.
                </p>
              </div>
            </div>
            <div className="panel panel-padding">
              <h3>Document identity</h3>
              <p className="muted">
                Create letterhead and document templates under Templates &
                drafts. Company details appear in printable documents.
              </p>
              <a className="text-link" href="/templates">
                Manage templates →
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-padding">
            <SectionTitle
              title="The people behind the progress"
              sub="Owners manage access. Managers oversee commercial records. Members collaborate. Viewers have read-only access."
              action={
                auth.user.role === "OWNER" && (
                  <Button onClick={() => setMember("new")}>
                    <Plus size={16} />
                    Add teammate
                  </Button>
                )
              }
            />
          </div>
          {team.isLoading ? (
            <Loading />
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>TEAM MEMBER</th>
                    <th>EMAIL</th>
                    <th>ROLE</th>
                    <th>STATUS</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {team.data?.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <span className="owner-cell">
                          <Avatar name={u.name} />
                          <b>{u.name}</b>
                        </span>
                      </td>
                      <td>{u.email}</td>
                      <td>{u.role.toLowerCase()}</td>
                      <td>
                        <Badge status={u.active ? "Active" : "Inactive"} />
                      </td>
                      <td>
                        {auth.user.role === "OWNER" && u.role !== "OWNER" && (
                          <Button variant="ghost" onClick={() => setMember(u)}>
                            <Pencil size={14} />
                            Edit access
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {security && <PasswordForm onClose={() => setSecurity(false)} />}{" "}
      {member && (
        <MemberForm
          member={member === "new" ? undefined : member}
          onClose={() => setMember(null)}
        />
      )}
    </>
  );
}
function MemberForm({
  member,
  onClose,
}: {
  member?: User;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
      name: member?.name || "",
      email: member?.email || "",
      role: member?.role || "MEMBER",
      active: member?.active ?? true,
      password: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const client = useQueryClient();
  return (
    <Modal
      title={member ? "Edit team access" : "Add a teammate"}
      description={
        member
          ? "Updating access ends their current sessions."
          : "Create an account and share its credentials privately. No invitation email is sent."
      }
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api("/team" + (member ? "/" + member.id : ""), {
              method: member ? "PATCH" : "POST",
              body: json(
                member
                  ? { name: form.name, role: form.role, active: form.active }
                  : {
                      name: form.name,
                      email: form.email,
                      role: form.role,
                      password: form.password,
                    },
              ),
            });
            client.invalidateQueries();
            toast.success("Team access saved");
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="modal-body form-grid">
          <label className="full-width">
            Full name
            <input
              required
              minLength={2}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="full-width">
            Email
            <input
              type="email"
              required
              disabled={!!member}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Role
            <select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as User["role"] })
              }
            >
              {["MANAGER", "MEMBER", "VIEWER"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          {member ? (
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Account active
            </label>
          ) : (
            <label className="full-width">
              Initial password
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <small>At least 12 characters.</small>
            </label>
          )}
          {error && <div className="form-error full-width">{error}</div>}
        </div>
        <div className="modal-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} type="submit">
            Save teammate
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordForm({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrent] = useState(""),
    [newPassword, setNew] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      title="Change your password"
      description="Changing your password signs you out on all devices."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (newPassword !== confirmation) {
            setError("New passwords do not match");
            return;
          }
          setBusy(true);
          try {
            await api("/auth/password", {
              method: "POST",
              body: json({ currentPassword, newPassword }),
            });
            window.location.assign("/login");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="modal-body form-grid">
          <label className="full-width">
            Current password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label className="full-width">
            New password
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              value={newPassword}
              onChange={(e) => setNew(e.target.value)}
            />
          </label>
          <label className="full-width">
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
          {error && <div className="form-error full-width">{error}</div>}
        </div>
        <div className="modal-footer">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} type="submit">
            Change password & sign out
          </Button>
        </div>
      </form>
    </Modal>
  );
}
