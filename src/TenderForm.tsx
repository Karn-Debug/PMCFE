import { Fragment, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Plus, Trash2, Pencil, Save, Printer, RotateCcw } from "lucide-react";
import { CheckCircle2, Clock3, CircleDot } from "lucide-react";
import { toast } from "sonner";
import { api, json } from "./api";
import { useAuth } from "./auth-context";
import { PageHead, Button, Modal, Loading, ErrorState, Badge } from "./ui";
export type CatalogEntry = {
  id: string;
  name: string;
  sortOrder: number;
  type: "Global" | "Custom";
  status: "Active" | "Inactive";
};
export type TenderRow = {
  id: string;
  serial: string;
  description: string;
  offer: string;
  remarks: string;
};
export type TenderSection = {
  id: string;
  serial: string;
  title: string;
  rows: TenderRow[];
};
export type TenderSetupData = {
  id?: string;
  version: number;
  regulation: string;
  unitTypes: CatalogEntry[];
  otherTerms: CatalogEntry[];
  sections: TenderSection[];
};
const uid = () => crypto.randomUUID();
export function TenderFormPage() {
  const q = useQuery({
      queryKey: ["tender-setup"],
      queryFn: () => api<TenderSetupData>("/tender-setup"),
    }),
    client = useQueryClient(),
    auth = useAuth();
  const [params, setParams] = useSearchParams(),
    [draft, setDraft] = useState<TenderSetupData | null>(null),
    [dirty, setDirty] = useState(false),
    [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{
    kind: "unitTypes" | "otherTerms";
    entry?: CatalogEntry;
  } | null>(null);
  const tab = ["type-unit", "description", "other-term", "preview"].includes(
    params.get("tab") || "",
  )
    ? params.get("tab")!
    : "description";
  const writable = ["OWNER", "MANAGER"].includes(auth.user.role);
  useEffect(() => {
    if (q.data && !dirty) setDraft(structuredClone(q.data));
  }, [q.data, dirty]);
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
  if (q.isLoading || !draft)
    return q.error ? (
      <ErrorState error={q.error} retry={() => q.refetch()} />
    ) : (
      <Loading />
    );
  function update(next: Partial<TenderSetupData>) {
    setDraft((d) => ({ ...d!, ...next }));
    setDirty(true);
  }
  function sections(next: TenderSection[]) {
    update({ sections: next });
  }
  function sectionChange(id: string, change: Partial<TenderSection>) {
    sections(
      draft!.sections.map((s) => (s.id === id ? { ...s, ...change } : s)),
    );
  }
  function rowChange(
    sectionId: string,
    rowId: string,
    change: Partial<TenderRow>,
  ) {
    sections(
      draft!.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              rows: s.rows.map((r) =>
                r.id === rowId ? { ...r, ...change } : r,
              ),
            }
          : s,
      ),
    );
  }
  function addRow(s: TenderSection, index: number) {
    const rows = [...s.rows];
    rows.splice(index, 0, {
      id: uid(),
      serial: s.serial + "." + String(index + 1),
      description: "",
      offer: "",
      remarks: "",
    });
    sectionChange(s.id, { rows });
  }
  function addSection(index: number) {
    const list = [...draft!.sections];
    list.splice(index, 0, {
      id: uid(),
      serial: String(index + 1),
      title: "New section",
      rows: [],
    });
    sections(list);
  }
  async function save() {
    setSaving(true);
    try {
      const { regulation, unitTypes, otherTerms, sections } = draft!;
      const saved = await api<TenderSetupData>("/tender-setup", {
        method: "PUT",
        headers: { "If-Match": String(draft!.version) },
        body: json({ regulation, unitTypes, otherTerms, sections }),
      });
      setDraft(saved);
      client.setQueryData(["tender-setup"], saved);
      setDirty(false);
      await client.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Tender Form saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  const catalogKey = tab === "type-unit" ? "unitTypes" : "otherTerms";
  const entries = [...draft[catalogKey]].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  return (
    <>
      <PageHead
        eyebrow="SETUP / MANAGE"
        title="Tender Form"
        description="Manage the reusable tender form, unit types, descriptions, and other terms."
      />
      <div className="legacy-tabs" role="tablist" aria-label="Tender setup">
        {[
          ["type-unit", "Type of Unit"],
          ["description", "Description"],
          ["other-term", "Terms & Conditions"],
          ["preview", "Preview"],
        ].map(([key, label]) => (
          <button
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? "active" : ""}
            key={key}
            onClick={() => setParams({ tab: key })}
          >
            {label}
          </button>
        ))}
      </div>
      {(tab === "type-unit" || tab === "other-term") && (
        <section className="panel tender-catalog">
          <div className="tender-catalog-tools">
            <h2>
              {tab === "type-unit" ? "Type of Unit" : "Terms & Conditions"}
            </h2>
            {writable && (
              <Button onClick={() => setEditing({ kind: catalogKey })}>
                <Plus size={17} />
                {tab === "type-unit" ? "Add Type Unit" : "Add Other Term"}
              </Button>
            )}
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sr.No.</th>
                  <th>Name</th>
                  <th>Sort Order</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.id}>
                    <td>{i + 1}</td>
                    <td>{e.name}</td>
                    <td>{e.sortOrder}</td>
                    <td>
                      <Badge status={e.type} />
                    </td>
                    <td>
                      <Badge status={e.status} />
                    </td>
                    <td>
                      {writable && e.type === "Custom" ? (
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            aria-label={"Edit " + e.name}
                            onClick={() =>
                              setEditing({ kind: catalogKey, entry: e })
                            }
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-btn"
                            aria-label={"Remove " + e.name}
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Remove " + e.name + " from the draft?",
                                )
                              )
                                update({
                                  [catalogKey]: draft[catalogKey].filter(
                                    (x) => x.id !== e.id,
                                  ),
                                });
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="muted">
                          {e.type === "Global" ? "Global entry" : "Read only"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!entries.length && <p className="empty">No entries yet.</p>}
          </div>
        </section>
      )}
      {tab === "description" && (
        <section className="panel tender-description">
          <div className="tender-catalog-tools">
            <h2>Tender description</h2>
            <label>
              Offer of tenderer under regulation
              <select
                value={draft.regulation}
                disabled={!writable}
                onChange={(e) => update({ regulation: e.target.value })}
              >
                <option>33(8)</option>
                <option>33(9)</option>
              </select>
            </label>
            {writable && (
              <Button onClick={() => addSection(draft.sections.length)}>
                <Plus size={16} />
                Add section
              </Button>
            )}
          </div>
          <div className="table-scroll">
            <table className="tender-edit-table">
              <colgroup>
                <col className="serial-col" />
                <col className="description-col" />
                <col className="offer-col" />
                <col className="remarks-col" />
                <col className="actions-col" />
              </colgroup>
              <thead>
                <tr>
                  <th>Sr.No</th>
                  <th>Description</th>
                  <th>Offer of tenderer under Regulation {draft.regulation}</th>
                  <th>Remarks</th>
                  <th>Add / Delete</th>
                </tr>
              </thead>
              <tbody>
                {draft.sections.map((s, i) => (
                  <Fragment key={s.id}>
                    <tr className="tender-section-row">
                      <td>
                        <input
                          aria-label={"Section " + (i + 1) + " number"}
                          value={s.serial}
                          disabled={!writable}
                          onChange={(e) =>
                            sectionChange(s.id, { serial: e.target.value })
                          }
                        />
                      </td>
                      <td colSpan={3}>
                        <input
                          aria-label={"Section " + (i + 1) + " title"}
                          value={s.title}
                          disabled={!writable}
                          onChange={(e) =>
                            sectionChange(s.id, { title: e.target.value })
                          }
                        />
                      </td>
                      <td>
                        <div className="tender-actions">
                          {writable && (
                            <>
                              <button
                                className="icon-btn"
                                aria-label={"Add section after " + s.serial}
                                onClick={() => addSection(i + 1)}
                              >
                                <Plus size={17} />
                              </button>
                              <button
                                className="icon-btn"
                                aria-label={"Delete section " + s.serial}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Remove this section and its rows from the draft?",
                                    )
                                  )
                                    sections(
                                      draft.sections.filter(
                                        (x) => x.id !== s.id,
                                      ),
                                    );
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {s.rows.map((r, j) => (
                      <tr key={r.id}>
                        <td>
                          <input
                            aria-label={"Row " + r.serial + " number"}
                            value={r.serial}
                            disabled={!writable}
                            onChange={(e) =>
                              rowChange(s.id, r.id, { serial: e.target.value })
                            }
                          />
                        </td>
                        {(["description", "offer", "remarks"] as const).map(
                          (field) => (
                            <td key={field}>
                              <textarea
                                aria-label={field + " " + r.serial}
                                rows={6}
                                value={r[field]}
                                disabled={!writable}
                                onChange={(e) =>
                                  rowChange(s.id, r.id, {
                                    [field]: e.target.value,
                                  })
                                }
                              />
                            </td>
                          ),
                        )}
                        <td>
                          <div className="tender-actions">
                            {writable && (
                              <>
                                <button
                                  className="icon-btn"
                                  aria-label={"Add row after " + r.serial}
                                  onClick={() => addRow(s, j + 1)}
                                >
                                  <Plus size={17} />
                                </button>
                                <button
                                  className="icon-btn"
                                  aria-label={"Delete row " + r.serial}
                                  onClick={() =>
                                    sectionChange(s.id, {
                                      rows: s.rows.filter((x) => x.id !== r.id),
                                    })
                                  }
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!s.rows.length && (
                      <tr>
                        <td colSpan={5}>
                          <Button
                            variant="secondary"
                            disabled={!writable}
                            onClick={() => addRow(s, 0)}
                          >
                            <Plus size={16} />
                            Add first row
                          </Button>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "preview" && (
        <>
          <div className="tender-preview-tools">
            <span>
              {dirty
                ? "Preview includes your unsaved changes."
                : "Preview of the saved tender form."}
            </span>
            <Button onClick={() => window.print()}>
              <Printer size={16} />
              Print / Save PDF
            </Button>
          </div>
          <div className="tender-print-wrap">
            <article className="tender-print-document">
              <TenderPreview data={draft} />
            </article>
          </div>
        </>
      )}
      <div className="editor-savebar">
        <span
          className={
            "save-state " +
            (dirty ? "pending" : draft.version ? "saved" : "neutral")
          }
          role="status"
        >
          {dirty ? (
            <Clock3 size={16} aria-hidden="true" />
          ) : draft.version ? (
            <CheckCircle2 size={16} aria-hidden="true" />
          ) : (
            <CircleDot size={16} aria-hidden="true" />
          )}
          <span>
            {dirty
              ? "Unsaved changes"
              : draft.version
                ? "All changes saved"
                : "New Tender Form"}{" "}
            · {draft.sections.length} sections ·{" "}
            {draft.sections.reduce((n, s) => n + s.rows.length, 0)} description
            rows
          </span>
        </span>
        {dirty && (
          <Button
            variant="secondary"
            onClick={() => {
              if (window.confirm("Discard unsaved changes?")) {
                setDirty(false);
                setDraft(structuredClone(q.data!));
              }
            }}
          >
            <RotateCcw size={16} />
            Discard changes
          </Button>
        )}
        {writable && (
          <Button onClick={save} disabled={saving || !dirty}>
            <Save size={16} />
            {saving ? "Saving…" : "Save"}
          </Button>
        )}
        {tab !== "preview" && (
          <Button
            variant="secondary"
            onClick={() => setParams({ tab: "preview" })}
          >
            <Printer size={16} />
            Preview
          </Button>
        )}
      </div>
      {editing && (
        <CatalogEditor
          value={editing.entry}
          unit={editing.kind === "unitTypes"}
          onClose={() => setEditing(null)}
          onSave={(entry) => {
            const list = draft[editing.kind];
            update({
              [editing.kind]: editing.entry
                ? list.map((e) => (e.id === entry.id ? entry : e))
                : [...list, entry],
            });
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
function CatalogEditor({
  value,
  unit,
  onClose,
  onSave,
}: {
  value?: CatalogEntry;
  unit: boolean;
  onClose: () => void;
  onSave: (entry: CatalogEntry) => void;
}) {
  const [v, setV] = useState<CatalogEntry>(
    value || {
      id: uid(),
      name: "",
      sortOrder: 0,
      type: "Custom",
      status: "Active",
    },
  );
  return (
    <Modal
      title={(value ? "Edit " : "Add ") + (unit ? "Type Unit" : "Other Term")}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(v);
        }}
      >
        <div className="modal-body form-grid">
          <label className="full-width">
            {unit ? "Type Unit" : "Name"} *
            <input
              autoFocus
              required
              value={v.name}
              onChange={(e) => setV({ ...v, name: e.target.value })}
            />
          </label>
          <label>
            Sort Order
            <input
              type="number"
              min={0}
              max={9999}
              value={v.sortOrder}
              onChange={(e) =>
                setV({ ...v, sortOrder: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Status
            <select
              value={v.status}
              onChange={(e) =>
                setV({ ...v, status: e.target.value as CatalogEntry["status"] })
              }
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>
        </div>
        <div className="modal-footer">
          <span className="muted">
            Added to your draft. Save the Tender Form to apply.
          </span>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Apply to form</Button>
        </div>
      </form>
    </Modal>
  );
}
export function TenderPreview({ data }: { data: TenderSetupData }) {
  return (
    <table className="tender-preview-table">
      <colgroup>
        <col style={{ width: "8%" }} />
        <col style={{ width: "42%" }} />
        <col style={{ width: "27%" }} />
        <col style={{ width: "23%" }} />
      </colgroup>
      <thead>
        <tr>
          <th>Sr.No</th>
          <th>Description</th>
          <th>Offer of tenderer under Regulation {data.regulation}</th>
          <th>Remarks</th>
        </tr>
      </thead>
      <tbody>
        {data.sections.map((s) => (
          <Fragment key={s.id}>
            <tr className="section-heading">
              <th>{s.serial}</th>
              <th colSpan={3}>{s.title}</th>
            </tr>
            {s.rows.map((r) => (
              <tr key={r.id}>
                <td>{r.serial}</td>
                <td>{r.description}</td>
                <td>{r.offer}</td>
                <td>{r.remarks}</td>
              </tr>
            ))}
          </Fragment>
        ))}
        <tr className="section-heading">
          <th colSpan={4}>TERMS & CONDITIONS</th>
        </tr>
        {[...data.otherTerms]
          .filter((t) => t.status === "Active")
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((t, i) => (
            <tr key={t.id}>
              <td>{i + 1}</td>
              <td>{t.name}</td>
              <td />
              <td />
            </tr>
          ))}
      </tbody>
    </table>
  );
}
