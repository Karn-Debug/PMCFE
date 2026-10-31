import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Send, ShieldCheck } from "lucide-react";
import { api, json, date } from "./api";
import { Loading, ErrorState, Button } from "./ui";
export function Portal() {
  const { token } = useParams(),
    q = useQuery({
      queryKey: ["portal", token],
      queryFn: () => api("/portal/" + token),
      retry: false,
    }),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [form, setForm] = useState({
      amount: 0,
      additionalArea: 0,
      rent: 0,
      corpus: 0,
      completionMonths: 36,
      content: "",
    });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} retry={() => q.refetch()} />;
  const d = q.data;
  return (
    <div className="portal-page">
      <header>
        <b>
          STALLION <span>/ TENDER PORTAL</span>
        </b>
        <ShieldCheck size={20} />
      </header>
      <main className="panel">
        <div className="portal-hero">
          <span className="eyebrow">A PROPOSAL FOR WHAT'S NEXT</span>
          <h1>{d.title}</h1>
          <p>
            {d.project} · Prepared for {d.developerName}
          </p>
          <span>Submission deadline: {date(d.dueDate)}</span>
        </div>
        {done || d.submitted ? (
          <div className="empty portal-success">
            <CheckCircle2 size={45} />
            <h2>Your proposal is with the project team.</h2>
            <p>Thank you. Your quotation has been recorded.</p>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api("/portal/" + token, {
                  method: "POST",
                  body: json(form),
                });
                setDone(true);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="panel-padding">
              <p className="pre-wrap">{d.content}</p>
              {d.data.requirements?.map((r: any, i: number) => (
                <div className="requirement-view" key={i}>
                  <b>{r.serial || i + 1}</b>
                  <div>
                    <h4>{r.section}</h4>
                    <p>{r.description}</p>
                    <p>{r.offer}</p>
                    <small>{r.remarks}</small>
                  </div>
                </div>
              ))}
              {d.data.units && (
                <p>
                  <b>Type of unit:</b> {d.data.units}
                </p>
              )}
              {d.data.terms && (
                <section>
                  <h2>Terms &amp; Conditions</h2>
                  <p className="pre-wrap">{d.data.terms}</p>
                </section>
              )}
              <h2>Your commercial offer</h2>
              <div className="form-grid">
                {[
                  ["amount", "Proposal value (₹)"],
                  ["additionalArea", "Additional carpet area (%)"],
                  ["rent", "Monthly rent / sq. ft. (₹)"],
                  ["corpus", "Society corpus (₹)"],
                  ["completionMonths", "Completion period (months)"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="number"
                      min={key === "completionMonths" ? 1 : 0}
                      step="any"
                      required
                      value={form[key as "amount"]}
                      onChange={(e) =>
                        setForm({ ...form, [key]: Number(e.target.value) })
                      }
                    />
                  </label>
                ))}
                <label className="full-width">
                  Conditions and supporting remarks
                  <textarea
                    value={form.content}
                    onChange={(e) =>
                      setForm({ ...form, content: e.target.value })
                    }
                    rows={5}
                  />
                </label>
              </div>
              <div className="info-note">
                Review your offer before submitting. This invitation accepts one
                submission.
              </div>
              {error && <div className="form-error">{error}</div>}
              <Button type="submit" disabled={busy}>
                <Send size={16} />
                {busy ? "Submitting…" : "Submit quotation"}
              </Button>
            </div>
          </form>
        )}
      </main>
      <footer>Stallion PMC · Private developer submission</footer>
    </div>
  );
}
