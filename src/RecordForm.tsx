import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Upload, ArrowUpRight } from "lucide-react";
import { api, json, useProjects, useTeam, useRecords, money } from "./api";
import { modules } from "./config";
import { RichTextEditor, asHtml } from "./RichTextEditor";
import type { TenderSetupData } from "./TenderForm";
import type { Field } from "./config";
import type { Row } from "./types";
import { Modal, Button, SectionTitle } from "./ui";
export function payload(r: Row) {
  return {
    title: r.title,
    reference: r.reference || null,
    status: r.status,
    projectId: r.projectId || null,
    parentId: r.parentId || null,
    assigneeId: r.assigneeId || null,
    priority: r.priority,
    dueDate: r.dueDate || null,
    content: r.content,
    data: r.data,
  };
}
export function RecordForm({
  module,
  record,
  projectId,
  parentId,
  fixedCategory,
  onClose,
  onSaved,
}: {
  module: string;
  record?: Row;
  projectId?: string;
  parentId?: string;
  fixedCategory?: string;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const config = {
      ...modules[module],
      ...(fixedCategory === "Legal draft" ? { singular: "Draft" } : {}),
    },
    projects = useProjects(),
    team = useTeam(),
    topics = useRecords("topics"),
    tenderSetup = useQuery({
      queryKey: ["tender-setup"],
      queryFn: () => api<TenderSetupData>("/tender-setup"),
      enabled: module === "tenders",
    }),
    catalog = useRecords("schemes", { limit: "500" }),
    parents = useRecords(module === "quotes" ? "tenders" : "work-orders");
  const [form, setForm] = useState<any>({
      title: "",
      reference: "",
      status: config.statuses[0],
      projectId: projectId || "",
      parentId: parentId || "",
      assigneeId: "",
      priority: "Medium",
      dueDate: "",
      content: "",
      data: {
        ...structuredClone(config.defaults),
        ...(fixedCategory ? { category: fixedCategory } : {}),
      },
      ...(record ? payload(record) : {}),
      ...(record
        ? {
            dueDate: record.dueDate?.slice(0, 10) || "",
            data: { ...structuredClone(config.defaults), ...record.data },
          }
        : {}),
    }),
    [error, setError] = useState(""),
    [file, setFile] = useState<File | null>(null);
  const client = useQueryClient();
  const data = (key: string, value: unknown) =>
    setForm({ ...form, data: { ...form.data, [key]: value } });
  const mutation = useMutation({
    mutationFn: async () => {
      const saved = await api<Row>(
        "/records/" + module + (record ? "/" + record.id : ""),
        {
          method: record ? "PUT" : "POST",
          headers: record ? { "If-Match": String(record.version) } : {},
          body: json({
            ...form,
            reference: form.reference || null,
            projectId: form.projectId || null,
            parentId: form.parentId || null,
            assigneeId: form.assigneeId || null,
            dueDate: form.dueDate || null,
          }),
        },
      );
      if (file) {
        const body = new FormData();
        body.append("file", file);
        try {
          await api("/records/" + module + "/" + saved.id + "/files", {
            method: "POST",
            body,
          });
        } catch (e) {
          toast.error(
            "Record saved; attachment failed: " + (e as Error).message,
          );
        }
      }
      return saved;
    },
    onSuccess: (saved) => {
      client.invalidateQueries();
      toast.success(config.singular + (record ? " updated" : " created"));
      onSaved?.(saved.id);
      onClose();
    },
    onError: (e) => setError(e.message),
  });
  async function importWord(file: File) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({
        arrayBuffer: await file.arrayBuffer(),
      });
      setForm((v: any) => ({ ...v, content: result.value }));
      toast.success("Word text imported. Review formatting before saving.");
    } catch {
      toast.error("Unable to read this Word document. Use a .docx file.");
    }
  }
  const renderField = (field: Field) => {
    let value = form.data[field.key] ?? "";
    if (field.type === "date" && value) value = String(value).slice(0, 10);
    return (
      <label
        className={
          field.type === "textarea"
            ? "full-width"
            : field.type === "checkbox"
              ? "checkbox-field"
              : ""
        }
        key={field.key}
      >
        {field.type === "checkbox" ? (
          <>
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => data(field.key, e.target.checked)}
            />
            {field.label}
          </>
        ) : (
          <>
            {field.label}
            {field.required ? " *" : ""}
            {field.type === "select" ? (
              <select
                value={value}
                onChange={(e) => data(field.key, e.target.value)}
              >
                {field.options?.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                rows={3}
                value={value}
                onChange={(e) => data(field.key, e.target.value)}
              />
            ) : (
              <input
                type={field.type || "text"}
                value={value}
                required={field.required}
                min={field.type === "number" ? 0 : undefined}
                step={field.type === "number" ? "any" : undefined}
                list={field.key === "topic" ? "topic-list" : undefined}
                onChange={(e) =>
                  data(
                    field.key,
                    field.type === "number"
                      ? Number(e.target.value)
                      : e.target.value,
                  )
                }
              />
            )}
          </>
        )}
      </label>
    );
  };
  return (
    <Modal
      title={(record ? "Edit " : "New ") + config.singular.toLowerCase()}
      description={config.description}
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
          <label className="full-width">
            {["developers", "topics", "templates"].includes(module)
              ? "Name"
              : "Title"}{" "}
            *
            <input
              autoFocus
              required
              minLength={2}
              value={form.title}
              placeholder={config.singular + " name"}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          {config.project && (
            <label>
              Project
              <select
                value={form.projectId || ""}
                onChange={(e) =>
                  setForm({ ...form, projectId: e.target.value, parentId: "" })
                }
              >
                <option value="">Workspace-wide</option>
                {projects.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Status
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {config.statuses.map((s) => (
                <option
                  disabled={
                    (module === "invoices" &&
                      ["Paid", "Part paid"].includes(s) &&
                      s !== record?.status) ||
                    (module === "quotes" &&
                      s === "Accepted" &&
                      record?.status !== "Accepted")
                  }
                  key={s}
                >
                  {s}
                </option>
              ))}
            </select>
          </label>
          {!["developers", "topics", "templates", "schemes"].includes(
            module,
          ) && (
            <>
              <label>
                Reference
                <input
                  value={form.reference || ""}
                  onChange={(e) =>
                    setForm({ ...form, reference: e.target.value })
                  }
                  placeholder="Optional reference number"
                />
              </label>
              <label>
                {module === "meetings" ? "Meeting date" : "Due date"}
                <input
                  type="date"
                  value={form.dueDate || ""}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                />
              </label>
              <label>
                Assigned to
                <select
                  value={form.assigneeId || ""}
                  onChange={(e) =>
                    setForm({ ...form, assigneeId: e.target.value })
                  }
                >
                  <option value="">Unassigned</option>
                  {team.data
                    ?.filter((u) => u.active)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Priority
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                >
                  {["Low", "Medium", "High", "Urgent"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          {["quotes", "invoices"].includes(module) && (
            <label className="full-width">
              {module === "quotes" ? "Tender *" : "Linked work order"}
              <select
                required={module === "quotes"}
                value={form.parentId || ""}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              >
                <option value="">
                  Select {module === "quotes" ? "tender" : "work order"}
                </option>
                {parents.data?.items
                  .filter((p) => p.projectId === (form.projectId || null))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {!record && module === "permissions" && (
            <label className="full-width">
              Start from approval catalog
              <select
                defaultValue=""
                onChange={(e) => {
                  const selected = catalog.data?.items.find(
                    (r) => r.id === e.target.value,
                  );
                  if (selected)
                    setForm({
                      ...form,
                      title: selected.title,
                      data: {
                        ...form.data,
                        type: selected.data.type,
                        scheme: selected.data.scheme,
                        documents: selected.data.documents,
                      },
                    });
                }}
              >
                <option value="">Choose a reusable approval requirement</option>
                {catalog.data?.items
                  .filter((r) => r.status === "Active")
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {module === "tenders" && (
            <div className="full-width tender-setup-import">
              <div>
                <b>Saved Tender Form</b>
                <p>
                  Copy the unit types, numbered descriptions, and terms from
                  Setup/Manage.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={!tenderSetup.data}
                onClick={() => {
                  const setup = tenderSetup.data!;
                  if (
                    form.data.requirements.length &&
                    !window.confirm(
                      "Replace this tender's requirements with the saved Tender Form?",
                    )
                  )
                    return;
                  setForm({
                    ...form,
                    data: {
                      ...form.data,
                      regulation: setup.regulation,
                      unitTypes: setup.unitTypes
                        .filter((x) => x.status === "Active")
                        .map((x) => ({ name: x.name })),
                      units: setup.unitTypes
                        .filter((x) => x.status === "Active")
                        .map((x) => x.name)
                        .join(", "),
                      otherTerms: setup.otherTerms
                        .filter((x) => x.status === "Active")
                        .map((x) => ({ name: x.name })),
                      terms: setup.otherTerms
                        .filter((x) => x.status === "Active")
                        .map((x) => x.name)
                        .join("\n"),
                      requirements: setup.sections.flatMap((s) =>
                        s.rows.map((r) => ({
                          section: s.title,
                          sectionSerial: s.serial,
                          serial: r.serial,
                          description: r.description,
                          offer: r.offer,
                          remarks: r.remarks,
                        })),
                      ),
                    },
                  });
                  toast.success("Saved Tender Form copied into this tender");
                }}
              >
                Use saved Tender Form
              </Button>
            </div>
          )}
          {config.fields
            .filter((f) => !fixedCategory || f.key !== "category")
            .map(renderField)}
          <datalist id="topic-list">
            {topics.data?.items.map((t) => (
              <option key={t.id} value={t.title} />
            ))}
          </datalist>
          {["invoices", "work-orders"].includes(module) && (
            <div className="full-width">
              <SectionTitle
                title="Fee schedule"
                sub="GST is calculated per line. Deductions apply to the base amount."
              />
              <div className="line-items">
                {form.data.items.map((item: any, i: number) => (
                  <div key={i} className="line-item">
                    <label>
                      Description
                      <input
                        required
                        value={item.description}
                        onChange={(e) =>
                          data(
                            "items",
                            form.data.items.map((x: any, j: number) =>
                              j === i
                                ? { ...x, description: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                    {["quantity", "rate", "tax"].map((k) => (
                      <label key={k}>
                        {k === "rate"
                          ? "Rate (₹)"
                          : k === "tax"
                            ? "GST %"
                            : "Quantity"}
                        <input
                          type="number"
                          min={k === "quantity" ? 0.001 : 0}
                          max={k === "tax" ? 100 : undefined}
                          step="any"
                          required
                          value={item[k]}
                          onChange={(e) =>
                            data(
                              "items",
                              form.data.items.map((x: any, j: number) =>
                                j === i
                                  ? { ...x, [k]: Number(e.target.value) }
                                  : x,
                              ),
                            )
                          }
                        />
                      </label>
                    ))}
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={"Remove fee line " + (i + 1)}
                      disabled={form.data.items.length === 1}
                      onClick={() =>
                        data(
                          "items",
                          form.data.items.filter(
                            (_: any, j: number) => j !== i,
                          ),
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    data("items", [
                      ...form.data.items,
                      { description: "", quantity: 1, rate: 0, tax: 18 },
                    ])
                  }
                >
                  <Plus size={15} />
                  Add fee line
                </Button>
                <span className="form-total">
                  Estimated total{" "}
                  <b>
                    {money(
                      form.data.items.reduce(
                        (s: number, i: any) =>
                          s +
                          i.quantity *
                            i.rate *
                            (1 +
                              i.tax / 100 -
                              (form.data.tds + form.data.retention) / 100),
                        0,
                      ),
                    )}
                  </b>
                </span>
              </div>
            </div>
          )}
          {(module === "tenders" ||
            (module === "templates" &&
              form.data.category === "Tender form")) && (
            <div className="full-width">
              <SectionTitle
                title="Tender requirements"
                sub="Sections, offers, and remarks remain editable for each project."
                action={
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() =>
                      data("requirements", [
                        ...form.data.requirements,
                        {
                          section: "",
                          description: "",
                          offer: "",
                          remarks: "",
                        },
                      ])
                    }
                  >
                    <Plus size={15} />
                    Add requirement
                  </Button>
                }
              />
              {form.data.requirements.map((r: any, i: number) => (
                <div className="requirement-edit" key={i}>
                  <div className="flex-between">
                    <b>Requirement {i + 1}</b>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={"Remove requirement " + (i + 1)}
                      onClick={() =>
                        data(
                          "requirements",
                          form.data.requirements.filter(
                            (_: any, j: number) => j !== i,
                          ),
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="form-grid">
                    {["section", "description", "offer", "remarks"].map(
                      (key) => (
                        <label key={key}>
                          {key}
                          <textarea
                            rows={2}
                            value={r[key]}
                            onChange={(e) =>
                              data(
                                "requirements",
                                form.data.requirements.map(
                                  (v: any, j: number) =>
                                    j === i
                                      ? { ...v, [key]: e.target.value }
                                      : v,
                                ),
                              )
                            }
                          />
                        </label>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {["templates", "documents"].includes(module) ? (
            <div className="full-width">
              <label>Document content</label>
              <RichTextEditor
                value={asHtml(form.content, form.data.format)}
                onChange={(html) =>
                  setForm((v: any) => ({
                    ...v,
                    content: html,
                    data: { ...v.data, format: "html" },
                  }))
                }
              />
            </div>
          ) : (
            <label className="full-width">
              Notes / description
              <textarea
                rows={4}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </label>
          )}
          <label className="upload-zone full-width">
            <Upload size={22} />
            <span>{file ? file.name : "Attach a document"}</span>
            <small>PDF, images, Word, Excel or drawings · up to 15 MB</small>
            <input
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.size > 15 * 1024 * 1024) {
                  toast.error("File must be 15 MB or smaller");
                  return;
                }
                setFile(f || null);
              }}
            />
          </label>
          {error && (
            <div className="form-error full-width" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <span className="muted">Changes are saved to your workspace.</span>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Saving…"
              : record
                ? "Save changes"
                : "Create " + config.singular.toLowerCase()}
            <ArrowUpRight size={15} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
