import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Pencil,
  Download,
  Paperclip,
  Upload,
  MessageSquare,
  Send,
  Printer,
  Plus,
  Archive,
  ArrowUpRight,
  Link2,
  Check,
  ReceiptText,
  Flag,
} from "lucide-react";
import { api, json, date, money, useProjects, useRecords } from "./api";
import { modules } from "./config";
import type { Row } from "./types";
import {
  Modal,
  Button,
  Badge,
  Avatar,
  Loading,
  ErrorState,
  SectionTitle,
  Progress,
  Empty,
} from "./ui";
import { useAuth } from "./auth-context";
import { RecordForm } from "./RecordForm";
import { RichText, escapeHtml } from "./RichTextEditor";
export function RecordDetail({
  module,
  id,
  onClose,
  onEdit,
}: {
  module: string;
  id: string;
  onClose: () => void;
  onEdit?: (r: Row) => void;
}) {
  const q = useQuery({
      queryKey: ["record", module, id],
      queryFn: () => api<Row>("/records/" + module + "/" + id),
    }),
    client = useQueryClient(),
    auth = useAuth(),
    [comment, setComment] = useState(""),
    [printing, setPrinting] = useState(false),
    [paying, setPaying] = useState(false),
    [archiving, setArchiving] = useState(false),
    [awarding, setAwarding] = useState(false),
    [addingQuote, setAddingQuote] = useState(false),
    [invite, setInvite] = useState(false),
    [busy, setBusy] = useState(false);
  const quotes = useQuery({
      queryKey: ["quotes", id],
      queryFn: () => api<{ items: Row[] }>("/records/quotes?parentId=" + id),
      enabled: module === "tenders",
    }),
    developers = useRecords("developers");
  const [developer, setDeveloper] = useState(""),
    [inviteLink, setInviteLink] = useState("");
  const manager = ["OWNER", "MANAGER"].includes(auth.user.role),
    write = auth.user.role !== "VIEWER";
  async function upload(file: File) {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      await api("/records/" + module + "/" + id + "/files", {
        method: "POST",
        body,
      });
      await client.invalidateQueries();
      toast.success("File attached");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const config = modules[module],
    r = q.data;
  if (!r)
    return (
      <Modal title={config.singular} onClose={onClose}>
        {q.isLoading ? (
          <Loading />
        ) : (
          <ErrorState error={q.error} retry={() => q.refetch()} />
        )}
      </Modal>
    );
  const d = r.data;
  return (
    <>
      <Modal
        title={r.title}
        description={
          (r.reference ? r.reference + " · " : "") +
          (r.project?.name || "Workspace")
        }
        onClose={onClose}
        wide
      >
        <div className="detail-actionbar">
          {module === "quotes" && manager && r.status !== "Accepted" && (
            <Button onClick={() => setAwarding(true)}>
              <Check size={15} />
              Award quotation
            </Button>
          )}
          <Badge status={r.status} />
          <span className="priority-label" data-priority={r.priority}>
            {r.priority} priority
          </span>
          <div className="toolbar-spacer" />
          <Button variant="ghost" onClick={() => setPrinting(true)}>
            <Printer size={15} />
            Print / PDF
          </Button>
          {onEdit && (
            <Button variant="secondary" onClick={() => onEdit(r)}>
              <Pencil size={15} />
              Edit
            </Button>
          )}
        </div>
        <div className="modal-body record-detail">
          <div className="detail-grid">
            <div>
              <small>PROJECT</small>
              <b>{r.project?.name || "Workspace-wide"}</b>
            </div>
            <div>
              <small>ASSIGNED TO</small>
              <b>{r.assignee?.name || "Unassigned"}</b>
            </div>
            <div>
              <small>
                {module === "meetings" ? "MEETING DATE" : "DUE DATE"}
              </small>
              <b>{date(r.dueDate)}</b>
            </div>
            <div>
              <small>LAST UPDATED</small>
              <b>{date(r.updatedAt)}</b>
            </div>
          </div>
          {["invoices", "work-orders"].includes(module) && (
            <>
              <div className="billing-summary">
                <div>
                  <small>Base value</small>
                  <strong>{money(r.amount)}</strong>
                </div>
                <div>
                  <small>Total payable</small>
                  <strong>{money(r.total)}</strong>
                </div>
                <div>
                  <small>Received</small>
                  <strong>{money(r.paid)}</strong>
                </div>
                <div>
                  <small>Balance</small>
                  <strong>{money(Number(r.total) - Number(r.paid))}</strong>
                </div>
              </div>
              <SectionTitle
                title="Fee schedule"
                sub={d.developerName ? "Client: " + d.developerName : undefined}
              />
              <div className="table-scroll">
                <table className="data-table compact">
                  <thead>
                    <tr>
                      <th>DESCRIPTION</th>
                      <th>QUANTITY</th>
                      <th>RATE</th>
                      <th>GST</th>
                      <th>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.items?.map((i: any, n: number) => (
                      <tr key={n}>
                        <td>{i.description}</td>
                        <td>{i.quantity}</td>
                        <td>{money(i.rate)}</td>
                        <td>{i.tax}%</td>
                        <td>
                          {money(i.quantity * i.rate * (1 + i.tax / 100))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted">
                TDS: {d.tds || 0}% · Retention: {d.retention || 0}% (deducted
                from base value)
              </p>
              {module === "invoices" && (
                <>
                  <SectionTitle
                    title="Payment history"
                    action={
                      manager &&
                      ["Issued", "Part paid"].includes(r.status) && (
                        <Button onClick={() => setPaying(true)}>
                          <Plus size={15} />
                          Record payment
                        </Button>
                      )
                    }
                  />
                  {r.payments?.length ? (
                    <div className="payments-list">
                      {r.payments.map((p) => (
                        <div key={p.id}>
                          <span className="payment-icon">
                            <ReceiptText size={18} />
                          </span>
                          <div>
                            <b>{money(p.amount)}</b>
                            <small>
                              {p.method} · {p.reference}
                            </small>
                          </div>
                          <span>{date(p.date)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">
                      No receipts yet. Issue this invoice to begin recording
                      payments.
                    </p>
                  )}
                </>
              )}
              {d.terms && (
                <div className="note-block">
                  <h4>Terms & conditions</h4>
                  <p>{d.terms}</p>
                </div>
              )}
            </>
          )}
          {module === "tenders" && (
            <>
              <SectionTitle
                title="Tender requirements"
                sub={"Regulation " + d.regulation}
                action={
                  manager && (
                    <Button variant="secondary" onClick={() => setInvite(true)}>
                      <Link2 size={15} />
                      Create invitation
                    </Button>
                  )
                }
              />
              {d.requirements?.map((item: any, i: number) => (
                <div className="requirement-view" key={i}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h4>{item.section}</h4>
                    <p>{item.description}</p>
                    {item.offer && (
                      <p>
                        <b>Offer:</b> {item.offer}
                      </p>
                    )}
                    <small>{item.remarks}</small>
                  </div>
                </div>
              ))}
              <SectionTitle
                title="Compare developer proposals"
                sub="Commercial terms shown side by side. Review all conditions before accepting."
                action={
                  manager && (
                    <Button
                      variant="secondary"
                      onClick={() => setAddingQuote(true)}
                    >
                      <Plus size={14} />
                      Add quotation
                    </Button>
                  )
                }
              />
              {quotes.data?.items.length ? (
                <div className="table-scroll">
                  <table className="data-table comparison">
                    <thead>
                      <tr>
                        <th>PROPOSAL</th>
                        {quotes.data.items.map((v) => (
                          <th key={v.id}>{v.data.developerName}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Value", "amount"],
                        ["Additional area (%)", "additionalArea"],
                        ["Rent / sq. ft.", "rent"],
                        ["Society corpus", "corpus"],
                        ["Completion (months)", "completionMonths"],
                      ].map(([label, key]) => (
                        <tr key={key}>
                          <td>{label}</td>
                          {quotes.data!.items.map((v) => (
                            <td key={v.id}>
                              {["amount", "rent", "corpus"].includes(key)
                                ? money(v.data[key])
                                : v.data[key]}
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr>
                        <td>Status</td>
                        {quotes.data.items.map((v) => (
                          <td key={v.id}>
                            <Badge status={v.status} />
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td>Open quotation</td>
                        {quotes.data.items.map((v) => (
                          <td key={v.id}>
                            <a
                              className="text-link"
                              href={"/quotes?record=" + v.id}
                            >
                              View details <ArrowUpRight size={14} />
                            </a>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">
                  No quotations received yet. Add a quotation or create an
                  invitation link.
                </p>
              )}
            </>
          )}
          {module === "feasibility" && (
            <div className="feasibility-result">
              <span className="eyebrow">ILLUSTRATIVE SCENARIO</span>
              <div className="billing-summary">
                <div>
                  <small>Potential built area</small>
                  <strong>
                    {(d.plotArea * d.fsi).toLocaleString("en-IN")} sq. ft.
                  </strong>
                </div>
                <div>
                  <small>Illustrative surplus</small>
                  <strong>
                    {money(
                      d.plotArea * d.fsi * (d.saleRate - d.constructionRate) -
                        d.otherCost,
                      true,
                    )}
                  </strong>
                </div>
              </div>
              <p>
                This is a simple scenario calculation. It does not account for
                saleable-area allocation, rehabilitation, financing, taxes, or
                regulatory premiums. Keep your approved feasibility report
                attached below.
              </p>
            </div>
          )}
          {module === "progress" && (
            <div className="note-block">
              <h4>Milestone completion</h4>
              <Progress value={Number(d.percent)} />
              {d.videoUrl && (
                <a
                  className="text-link"
                  href={d.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open site video <ArrowUpRight size={14} />
                </a>
              )}
            </div>
          )}
          {!["invoices", "work-orders", "tenders"].includes(module) && (
            <div className="record-data-grid">
              {config.fields
                .filter(
                  (f) =>
                    d[f.key] !== "" &&
                    d[f.key] !== null &&
                    d[f.key] !== undefined,
                )
                .map((f) => (
                  <div
                    className={f.type === "textarea" ? "full-width" : ""}
                    key={f.key}
                  >
                    <small>{f.label.toUpperCase()}</small>
                    <p>
                      {f.type === "checkbox"
                        ? d[f.key]
                          ? "Yes"
                          : "No"
                        : f.type === "date"
                          ? date(d[f.key])
                          : String(d[f.key])}
                    </p>
                  </div>
                ))}
            </div>
          )}
          {r.content && (
            <div className="note-block">
              <h4>
                {module === "templates"
                  ? "Template content"
                  : "Notes & context"}
              </h4>
              {r.data.format === "html" ? (
                <RichText html={r.content} />
              ) : (
                <p className="pre-wrap">{r.content}</p>
              )}
            </div>
          )}
          <SectionTitle
            title="Attachments"
            sub="Original documents, stored with this record."
            action={
              write && (
                <label
                  className={
                    "btn btn-secondary file-button " + (busy ? "disabled" : "")
                  }
                >
                  <Upload size={15} />
                  {busy ? "Uploading…" : "Attach file"}
                  <input
                    type="file"
                    disabled={busy}
                    onChange={(e) =>
                      e.target.files?.[0] && upload(e.target.files[0])
                    }
                  />
                </label>
              )
            }
          />
          <div className="attachment-list">
            {r.files?.map((f) => (
              <a key={f.id} href={"/api/files/" + f.id} download>
                <Paperclip size={17} />
                <span>
                  <b>{f.name}</b>
                  <small>{(f.size / 1024).toFixed(1)} KB</small>
                </span>
                <Download size={16} />
              </a>
            ))}
          </div>
          {!r.files?.length && <p className="muted">No files attached.</p>}
          <SectionTitle
            title="Discussion"
            sub="Keep the context close to the work."
          />
          <div className="comments">
            {r.comments?.map((c) => (
              <div key={c.id}>
                <Avatar name={c.author} />
                <div>
                  <b>
                    {c.author}
                    <small>{date(c.createdAt)}</small>
                  </b>
                  <p>{c.content}</p>
                </div>
              </div>
            ))}
          </div>
          {write && (
            <form
              className="comment-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await api("/records/" + module + "/" + id + "/comments", {
                    method: "POST",
                    body: json({ content: comment }),
                  });
                  setComment("");
                  client.invalidateQueries();
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <textarea
                aria-label="Add a comment"
                placeholder="Share an update with the team…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                maxLength={5000}
              />
              <Button type="submit" disabled={busy || !comment.trim()}>
                <Send size={15} />
                Post comment
              </Button>
            </form>
          )}
        </div>
        <div className="modal-footer">
          {manager && (
            <Button variant="ghost" onClick={() => setArchiving(true)}>
              <Archive size={15} />
              Archive record
            </Button>
          )}
          <div className="toolbar-spacer" />
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Modal>
      {awarding && (
        <Modal
          title="Award this quotation?"
          description="This proposal will be accepted and its tender marked as awarded. Any previously accepted proposal for this tender will be rejected."
          onClose={() => setAwarding(false)}
        >
          <div className="modal-body">
            <p>{r.title}</p>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setAwarding(false)}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("/quotes/" + id + "/award", { method: "POST" });
                  client.invalidateQueries();
                  toast.success("Quotation awarded");
                  setAwarding(false);
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm award
            </Button>
          </div>
        </Modal>
      )}
      {printing && (
        <PrintPreview
          record={r}
          module={module}
          onClose={() => setPrinting(false)}
        />
      )}{" "}
      {paying && <PaymentDialog record={r} onClose={() => setPaying(false)} />}{" "}
      {addingQuote && (
        <RecordForm
          module="quotes"
          projectId={r.projectId || undefined}
          parentId={r.id}
          onClose={() => setAddingQuote(false)}
        />
      )}{" "}
      {archiving && (
        <Modal
          title="Archive this record?"
          description="It will leave the active list. You can restore it from the archive view."
          onClose={() => setArchiving(false)}
        >
          <div className="modal-body">
            <p>{r.title}</p>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" onClick={() => setArchiving(false)}>
              Keep record
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  await api("/records/" + module + "/" + id + "/archive", {
                    method: "POST",
                  });
                  client.invalidateQueries();
                  toast.success("Record archived");
                  onClose();
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              Archive
            </Button>
          </div>
        </Modal>
      )}
      {invite && (
        <Modal
          title="Invite a developer to quote"
          description="Create a private submission link valid for seven days. No email is sent automatically."
          onClose={() => setInvite(false)}
        >
          <div className="modal-body">
            <label>
              Developer company
              <select
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
              >
                <option value="">Choose developer</option>
                {developers.data?.items.map((d) => (
                  <option key={d.id} value={d.title}>
                    {d.title}
                  </option>
                ))}
              </select>
            </label>
            {inviteLink && (
              <div className="invite-result">
                <label>
                  Submission link
                  <input readOnly value={inviteLink} />
                </label>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(inviteLink);
                    toast.success("Link copied");
                  }}
                >
                  Copy link
                </Button>
                <small>
                  Localhost links are only accessible on this computer. Use your
                  deployed app URL for external developers.
                </small>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <Button
              disabled={!developer || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await api("/tenders/" + id + "/invitations", {
                    method: "POST",
                    body: json({ developerName: developer }),
                  });
                  setInviteLink(result.url);
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Create submission link
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function PaymentDialog({
  record,
  onClose,
}: {
  record: Row;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
      amount: "",
      date: new Date().toLocaleDateString("en-CA"),
      reference: "",
      method: "Bank transfer",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    client = useQueryClient();
  return (
    <Modal
      title="Record a payment"
      description={
        "Outstanding balance: " +
        money(Number(record.total) - Number(record.paid))
      }
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api("/records/invoices/" + record.id + "/payments", {
              method: "POST",
              body: json(form),
            });
            client.invalidateQueries();
            toast.success("Payment recorded");
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="modal-body form-grid">
          <label>
            Amount received (₹) *
            <input
              autoFocus
              type="number"
              step="0.01"
              min="0.01"
              max={Number(record.total) - Number(record.paid)}
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </label>
          <label>
            Payment date *
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>
          <label>
            Transaction reference *
            <input
              required
              minLength={2}
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />
          </label>
          <label>
            Method
            <select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
            >
              {["Bank transfer", "UPI", "Cheque", "Cash"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <div className="info-note full-width">
            This records a receipt in the ledger. It does not transfer money.
          </div>
          {error && <div className="form-error full-width">{error}</div>}
        </div>
        <div className="modal-footer">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Recording…" : "Record payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function PrintPreview({
  record: r,
  module,
  onClose,
}: {
  record: Row;
  module: string;
  onClose: () => void;
}) {
  const auth = useAuth(),
    projects = useProjects(),
    letterheads = useRecords("templates", { limit: "500" }),
    [letterheadId, setLetterheadId] = useState(""),
    [templateId, setTemplateId] = useState(""),
    [headerId, setHeaderId] = useState(""),
    [footerId, setFooterId] = useState(""),
    [projectId, setProjectId] = useState(r.projectId || ""),
    [values, setValues] = useState<Record<string, string>>({});
  const project = projects.data?.find((p) => p.id === projectId);
  const letterhead = letterheads.data?.items.find((r) => r.id === letterheadId);
  const images =
    letterhead?.files?.filter((f) =>
      ["image/png", "image/jpeg", "image/webp"].includes(f.mime),
    ) || [];
  const templates =
    letterheads.data?.items.filter(
      (t) =>
        t.data.category ===
        (module === "work-orders" ? "Work order" : "Invoice"),
    ) || [];
  const selectedTemplate = templates.find((t) => t.id === templateId);
  const source = selectedTemplate?.content ?? r.content;
  const isHtml = (selectedTemplate?.data.format ?? r.data.format) === "html";
  const automatic: Record<string, string> = {
    PLOT_SOCIETY_NAME: project?.society || project?.name || "",
    SOCIETY_LOCATION: project?.location || "",
    PROJECT_NAME: project?.name || r.project?.name || "",
    PROJECT_ADDRESS: project?.address || project?.location || "",
    COMPANY_NAME: auth.organization.name,
    PMC_COMPANY_NAME: auth.organization.name,
    SELECT_USER: auth.user.name,
    CURRENT_DATE: date(new Date().toISOString()),
    WO_NO: r.reference || "",
    INVOICE_NO: r.reference || "",
    DESCRIPTION: r.title,
    DEVELOPER_NAME: r.data.developerName || "",
    Retention: String(r.data.retention || 0),
    Site_coordinator:
      project?.coordinators?.map((c) => c.name).join(", ") || "",
    gst_number: auth.organization.profile.gst || "",
    pan_number: auth.organization.profile.pan || "",
    TERMS_COND: r.data.terms || "",
  };
  const replacements = { ...automatic, ...values };
  const billingHtml =
    "<table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>GST %</th><th>Amount</th></tr></thead><tbody>" +
    (r.data.items || [])
      .map(
        (i: any) =>
          "<tr><td>" +
          escapeHtml(i.description) +
          "</td><td>" +
          Number(i.quantity) +
          "</td><td>" +
          money(i.rate) +
          "</td><td>" +
          Number(i.tax) +
          "</td><td>" +
          money(
            Math.round(i.quantity * i.rate * 100) / 100 +
              Math.round(i.quantity * i.rate * i.tax) / 100,
          ) +
          "</td></tr>",
      )
      .join("") +
    "</tbody></table><p><strong>Total payable: " +
    money(r.total) +
    "</strong></p><p>TDS: " +
    Number(r.data.tds || 0) +
    "% · Retention: " +
    Number(r.data.retention || 0) +
    "%</p>";
  const macros = [
    ...new Set([...source.matchAll(/\|\|([^|<>]+)\|\|/g)].map((m) => m[1])),
  ];
  const content = source.replace(/\|\|([^|<>]+)\|\|/g, (_, key) => {
    if (
      key === "BILLING_STRUCTURE" &&
      isHtml &&
      ["work-orders", "invoices"].includes(module)
    )
      return billingHtml;
    const value =
      replacements[key] || "[" + key.toLowerCase().replaceAll("_", " ") + "]";
    return isHtml ? escapeHtml(value).replaceAll("\n", "<br>") : value;
  });
  return (
    <Modal
      title="Document preview"
      description="Review the generated document, then print or save as PDF."
      onClose={onClose}
      wide
    >
      <div className="print-controls">
        {["work-orders", "invoices"].includes(module) && (
          <label>
            Document template
            <select
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value);
                setValues({});
              }}
            >
              <option value="">Standard document</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.status})
                </option>
              ))}
            </select>
          </label>
        )}
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
        <label>
          Letterhead
          <select
            value={letterheadId}
            onChange={(e) => {
              setLetterheadId(e.target.value);
              const files =
                letterheads.data?.items.find((r) => r.id === e.target.value)
                  ?.files || [];
              setHeaderId(files.find((f) => /header/i.test(f.name))?.id || "");
              setFooterId(files.find((f) => /footer/i.test(f.name))?.id || "");
            }}
          >
            <option value="">Company profile</option>
            {letterheads.data?.items
              .filter((r) => r.data.category === "Letterhead")
              .map((r) => (
                <option value={r.id} key={r.id}>
                  {r.title} ({r.status})
                </option>
              ))}
          </select>
        </label>
        <Button onClick={() => window.print()}>
          <Printer size={16} />
          Print / Save PDF
        </Button>
      </div>
      {letterheadId && (
        <div className="macro-value-grid">
          <label>
            Header image
            <select
              value={headerId}
              onChange={(e) => setHeaderId(e.target.value)}
            >
              <option value="">Text only</option>
              {images.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Footer image
            <select
              value={footerId}
              onChange={(e) => setFooterId(e.target.value)}
            >
              <option value="">Text only</option>
              {images.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <p className="muted">
            Check the company identity on the letterhead before sharing.
          </p>
        </div>
      )}
      {macros.filter(
        (m) =>
          ![
            "PLOT_SOCIETY_NAME",
            "SOCIETY_LOCATION",
            "COMPANY_NAME",
            "SELECT_USER",
            "BILLING_STRUCTURE",
          ].includes(m),
      ).length > 0 && (
        <div className="macro-value-grid">
          {macros
            .filter(
              (m) =>
                ![
                  "PLOT_SOCIETY_NAME",
                  "SOCIETY_LOCATION",
                  "COMPANY_NAME",
                  "SELECT_USER",
                  "BILLING_STRUCTURE",
                ].includes(m),
            )
            .map((m) => (
              <label key={m}>
                {m.toLowerCase().replaceAll("_", " ")}
                <input
                  value={values[m] ?? automatic[m] ?? ""}
                  onChange={(e) =>
                    setValues({ ...values, [m]: e.target.value })
                  }
                />
              </label>
            ))}
        </div>
      )}
      <div className="print-preview-wrap">
        <article className="print-sheet">
          <header>
            {headerId ? (
              <img
                className="letterhead-image"
                src={"/api/files/" + headerId + "/preview"}
                alt="Letterhead header"
              />
            ) : (
              <b>
                {letterhead?.data.header ||
                  r.data.header ||
                  auth.organization.name}
              </b>
            )}
            <span>PROJECT MANAGEMENT CONSULTANCY</span>
            <p>{auth.organization.profile.address}</p>
          </header>
          {!selectedTemplate && (
            <>
              <div className="print-document-meta">
                <span>
                  {r.reference || modules[module].singular.toUpperCase()}
                </span>
                <span>{date(r.createdAt)}</span>
              </div>
              <h1>{r.title}</h1>
              <p>{project?.name || r.project?.name}</p>
            </>
          )}
          {!selectedTemplate &&
            ["invoices", "work-orders"].includes(module) && (
              <>
                <p>
                  <b>Bill to:</b> {r.data.developerName || "—"}
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>GST %</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.data.items.map((item: any, i: number) => (
                      <tr key={i}>
                        <td>{item.description}</td>
                        <td>{item.quantity}</td>
                        <td>{money(item.rate)}</td>
                        <td>{item.tax}</td>
                        <td>
                          {money(
                            item.quantity * item.rate * (1 + item.tax / 100),
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="print-totals">
                  <p>
                    Base amount <b>{money(r.amount)}</b>
                  </p>
                  <p>
                    TDS / retention{" "}
                    <b>
                      {r.data.tds || 0}% / {r.data.retention || 0}%
                    </b>
                  </p>
                  <p>
                    Total payable <b>{money(r.total)}</b>
                  </p>
                  <p>
                    Received <b>{money(r.paid)}</b>
                  </p>
                  <p>
                    Balance <b>{money(Number(r.total) - Number(r.paid))}</b>
                  </p>
                </div>
                <p className="pre-wrap">{r.data.terms}</p>
              </>
            )}
          {isHtml ? (
            <RichText html={content} />
          ) : (
            <div className="print-content">{content}</div>
          )}
          {(module === "tenders" || r.data.category === "Tender form") &&
            r.data.requirements?.map((item: any, i: number) => (
              <section key={i}>
                <h3>
                  {item.serial || i + 1}. {item.section}
                </h3>
                <p>{item.description}</p>
                <p>{item.offer}</p>
                <small>{item.remarks}</small>
              </section>
            ))}
          <footer>
            {footerId && (
              <img
                className="letterhead-image"
                src={"/api/files/" + footerId + "/preview"}
                alt="Letterhead footer"
              />
            )}
            {letterhead?.data.footer ||
              r.data.footer ||
              auth.organization.profile.address ||
              "Stallion PMC"}
            {auth.organization.isDemo && (
              <span>LOCAL DEMO — SAMPLE DOCUMENT</span>
            )}
          </footer>
        </article>
      </div>
    </Modal>
  );
}
