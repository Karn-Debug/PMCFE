import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useQueryClient } from "@tanstack/react-query";
import { Printer, Save, Upload, FileText } from "lucide-react";
import { CheckCircle2, Clock3, CircleDot } from "lucide-react";
import { toast } from "sonner";
import { api, json, useRecords, useProjects, date } from "./api";
import { useAuth } from "./auth-context";
import { PageHead, Button, Loading, ErrorState, Modal } from "./ui";
import type { Row } from "./types";
import { payload } from "./RecordForm";
import {
  RichTextEditor,
  RichText,
  asHtml,
  cleanHtml,
  escapeHtml,
} from "./RichTextEditor";

export const templateKinds = {
  workorder: {
    title: "PMC Workorder Template",
    category: "Work order",
    reference: "LEGACY-TPL-01",
  },
  demand: {
    title: "Demand / Invoice Template",
    category: "Invoice",
    reference: "LEGACY-TPL-02",
  },
  terms: {
    title: "Terms & Conditions",
    category: "Terms & conditions",
    reference: "LEGACY-TPL-03",
  },
  letterhead: {
    title: "Letterhead",
    category: "Letterhead",
    reference: "LEGACY-LETTERHEAD",
  },
} as const;
const baseMacros = [
  "SELECT_USER",
  "PLOT_SOCIETY_NAME",
  "SOCIETY_LOCATION",
  "CTS_NO",
  "LANDLORD_OWNER_NAME",
  "EXISTING_PLOT_AREA_IN_SQ_FT",
  "EXISTING_PLOT_AREA_IN_METERS",
  "ADDITIONAL_AREA_IN_PERCENTAGE",
  "TOTAL_AREA_IN_SQ_FT",
  "COMPANY_NAME",
  "PARTNERS",
  "PROPOSED_AREA",
  "RENT_PER_SQ_FT",
  "RENT_IN_LUMP_SUM",
  "CORPUS_FOR_SOCIETY",
  "TENANT_OCCUPANTS",
  "PLANNED_ARCHITECT",
  "SIGNATURE_OF_ADMIN",
  "COMPLETION_IN_YEARS",
  "TENANT",
  "SHOPS",
  "APPROX_FLOORS",
  "FLAT_CONFIG",
  "NO_OF_PARKING",
  "MIN_NO_OF_ELEVATOR",
  "WO_NO",
  "CURRENT_DATE",
  "DEVELOPER_NAME",
  "DEVELOPER_ADDRESS",
  "REISSUED",
  "DESCRIPTION",
  "PROJECT_NAME",
  "PROJECT_ADDRESS",
  "BILLING_STRUCTURE",
  "Retention",
  "Site_coordinator",
  "gst_number",
  "pan_number",
  "Service_Provider_Contact",
  "Service_Provider_Email",
  "Service_Provider_Bank_Name",
  "Service_Provider_Bank_AC",
  "Service_Provider_Bank_IFSC",
  "SERVICE_PROVIDER_GST",
  "SERVICE_PROVIDER_PAN",
  "TERMS_COND",
  "PMC_COMPANY_NAME",
  "SIGNETURE",
  "WO_SIGN_DATE",
  "DESIGNATION",
];
export function TemplatePage({ kind }: { kind: keyof typeof templateKinds }) {
  const config = templateKinds[kind],
    q = useRecords("templates", { category: config.category, limit: "500" }),
    client = useQueryClient(),
    auth = useAuth();
  const [selected, setSelected] = useState(""),
    [html, setHtml] = useState(""),
    [editor, setEditor] = useState<Editor | null>(null),
    [saving, setSaving] = useState(false),
    [dirty, setDirty] = useState(false),
    [search, setSearch] = useState(""),
    [preview, setPreview] = useState(false),
    [header, setHeader] = useState(""),
    [footer, setFooter] = useState("");
  const r =
    q.data?.items.find((x) => x.id === selected) ||
    q.data?.items.find((x) => x.reference === config.reference) ||
    q.data?.items[0];
  const writable = ["OWNER", "MANAGER"].includes(auth.user.role);
  useEffect(() => {
    setHtml(asHtml(r?.content || "", r?.data.format));
    setHeader(r?.data.header || "");
    setFooter(r?.data.footer || "");
    setDirty(false);
  }, [r?.id, r?.version, kind]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function save() {
    setSaving(true);
    try {
      const base = r
        ? payload(r)
        : {
            title: config.title,
            status: "Active",
            reference: "PMC-TEMPLATE-" + kind.toUpperCase(),
            projectId: null,
            parentId: null,
            assigneeId: null,
            priority: "Medium",
            dueDate: null,
            data: {},
          };
      const next = await api<Row>(
        "/records/templates" + (r ? "/" + r.id : ""),
        {
          method: r ? "PUT" : "POST",
          headers: r ? { "If-Match": String(r.version) } : {},
          body: json({
            ...base,
            content: cleanHtml(html),
            data: {
              ...base.data,
              format: "html",
              category: config.category,
              header,
              footer,
            },
          }),
        },
      );
      setSelected(next.id);
      setDirty(false);
      await client.invalidateQueries();
      toast.success("Template updated");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function attach(file: File, part: string) {
    if (!r) {
      toast.error("Save the letterhead before adding images");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Choose a PNG, JPEG, or WebP image");
      return;
    }
    const body = new FormData();
    body.append("file", file, part + "-" + file.name);
    try {
      await api("/records/templates/" + r.id + "/files", {
        method: "POST",
        body,
      });
      await client.invalidateQueries();
      toast.success(part + " image attached");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} retry={() => q.refetch()} />;
  const macros = [
    ...new Set([
      ...baseMacros,
      ...[...html.matchAll(/\|\|([^|<>]+)\|\|/g)].map((m) => m[1]),
    ]),
  ].filter(
    (m) =>
      m.toLowerCase().replaceAll("_", " ").includes(search.toLowerCase()) ||
      m.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHead
        eyebrow="SETUP / MANAGE · TEMPLATE"
        title={config.title}
        description={
          kind === "letterhead"
            ? "Manage the header and footer used in your documents."
            : "Edit the Word-style document, insert macros, and review the A4 preview."
        }
      />
      <section className="panel template-workspace">
        {(q.data?.items.length || 0) > 1 && (
          <label className="template-select">
            Saved template
            <select
              value={r?.id || ""}
              onChange={(e) => {
                if (
                  !dirty ||
                  window.confirm("Discard unsaved template changes?")
                )
                  setSelected(e.target.value);
              }}
            >
              {q.data!.items.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind === "letterhead" ? (
          <>
            <div className="form-grid">
              <label>
                Header text
                <textarea
                  value={header}
                  disabled={!writable}
                  onChange={(e) => {
                    setHeader(e.target.value);
                    setDirty(true);
                  }}
                />
              </label>
              <label>
                Footer text
                <textarea
                  value={footer}
                  disabled={!writable}
                  onChange={(e) => {
                    setFooter(e.target.value);
                    setDirty(true);
                  }}
                />
              </label>
            </div>
            <div className="letterhead-upload-grid">
              {["header", "footer"].map((part) => (
                <div key={part}>
                  <h3>{part === "header" ? "Header image" : "Footer image"}</h3>
                  {r?.files
                    ?.filter(
                      (f) =>
                        f.name.toLowerCase().includes(part) &&
                        f.mime.startsWith("image/"),
                    )
                    .map((f) => (
                      <div className="letterhead-file" key={f.id}>
                        <img
                          src={"/api/files/" + f.id + "/preview"}
                          alt={part}
                        />
                        <a href={"/api/files/" + f.id}>{f.name}</a>
                      </div>
                    ))}
                  {writable && (
                    <label className="upload-zone">
                      <Upload size={18} />
                      Upload {part}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            void attach(e.target.files[0], part);
                        }}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="template-field-label">
              <FileText size={18} />
              <b>Template content</b>
              <span>Import .docx files using Import Word in the editor.</span>
            </div>
            <RichTextEditor
              key={r?.id || kind}
              value={html}
              onReady={setEditor}
              onChange={(v) => {
                setHtml(v);
                setDirty(true);
              }}
              readOnly={!writable}
            />
            <div className="macro-library">
              <label>
                Template Content Macros
                <input
                  type="search"
                  placeholder="Search macros…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <div className="macro-list">
                {macros.map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={!writable}
                    onClick={() =>
                      editor
                        ?.chain()
                        .focus()
                        .insertContent("||" + m + "||")
                        .run()
                    }
                  >
                    <span>{m.replaceAll("_", " ")}</span>
                    <code>{"||" + m + "||"}</code>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
      <div className="editor-savebar">
        <span
          className={
            "save-state " + (dirty ? "pending" : r ? "saved" : "neutral")
          }
          role="status"
        >
          {dirty ? (
            <Clock3 size={16} aria-hidden="true" />
          ) : r ? (
            <CheckCircle2 size={16} aria-hidden="true" />
          ) : (
            <CircleDot size={16} aria-hidden="true" />
          )}
          {dirty
            ? "Unsaved changes"
            : r
              ? "Saved · " + date(r.updatedAt)
              : "New template"}
        </span>
        {writable && (
          <Button onClick={save} disabled={saving}>
            <Save size={16} />
            {saving ? "Updating…" : "Update"}
          </Button>
        )}
        <Button variant="secondary" onClick={() => setPreview(true)}>
          <Printer size={16} />
          A4 Preview
        </Button>
      </div>
      {preview && (
        <DocumentPreview
          title={config.title}
          html={html}
          header={header}
          footer={footer}
          files={r?.files}
          onClose={() => setPreview(false)}
        />
      )}
    </>
  );
}
export function DocumentPreview({
  title,
  html,
  header = "",
  footer = "",
  files,
  onClose,
}: {
  title: string;
  html: string;
  header?: string;
  footer?: string;
  files?: Row["files"];
  onClose: () => void;
}) {
  const auth = useAuth(),
    projects = useProjects(),
    [projectId, setProjectId] = useState(""),
    [values, setValues] = useState<Record<string, string>>({});
  const project = projects.data?.find((p) => p.id === projectId);
  const defaults: Record<string, string> = {
    SELECT_USER: auth.user.name,
    PLOT_SOCIETY_NAME: project?.society || project?.name || "",
    SOCIETY_LOCATION: project?.location || "",
    PROJECT_NAME: project?.name || "",
    PROJECT_ADDRESS: project?.address || "",
    COMPANY_NAME: auth.organization.name,
    PMC_COMPANY_NAME: auth.organization.name,
    CURRENT_DATE: new Date().toLocaleDateString("en-IN"),
    Site_coordinator: project?.coordinators.map((c) => c.name).join(", ") || "",
  };
  const keys = [
    ...new Set([...html.matchAll(/\|\|([^|<>]+)\|\|/g)].map((m) => m[1])),
  ];
  const resolved = html.replace(/\|\|([^|<>]+)\|\|/g, (_, key) =>
    escapeHtml(values[key] || defaults[key] || "||" + key + "||"),
  );
  const headerImage = files?.find(
      (f) => /header/i.test(f.name) && f.mime.startsWith("image/"),
    ),
    footerImage = files?.find(
      (f) => /footer/i.test(f.name) && f.mime.startsWith("image/"),
    );
  return (
    <Modal
      title="A4 Preview"
      description="Review formatting and fill any remaining macros before printing."
      onClose={onClose}
      wide
    >
      <div className="print-controls">
        <label>
          Project
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Select project</option>
            {projects.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <Button onClick={() => window.print()}>
          <Printer size={16} />
          Print / Save PDF
        </Button>
      </div>
      {!!keys.length && (
        <details className="preview-macros">
          <summary>Fill document macros ({keys.length})</summary>
          <div className="macro-value-grid">
            {keys.map((k) => (
              <label key={k}>
                {k.replaceAll("_", " ")}
                <input
                  value={values[k] ?? defaults[k] ?? ""}
                  onChange={(e) =>
                    setValues({ ...values, [k]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
        </details>
      )}
      <div className="print-preview-wrap">
        <article className="print-sheet rich-print-sheet" aria-label={title}>
          {(header || headerImage) && (
            <header>
              {headerImage && (
                <img
                  className="letterhead-image"
                  src={"/api/files/" + headerImage.id + "/preview"}
                  alt="Header"
                />
              )}
              {header && <p>{header}</p>}
            </header>
          )}
          <RichText html={resolved} />
          {(footer || footerImage) && (
            <footer>
              {footerImage && (
                <img
                  className="letterhead-image"
                  src={"/api/files/" + footerImage.id + "/preview"}
                  alt="Footer"
                />
              )}
              {footer}
            </footer>
          )}
        </article>
      </div>
    </Modal>
  );
}
