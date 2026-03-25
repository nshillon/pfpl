// src/components/AdminEmailTool.jsx
// Rich email marketing tool for the admin page
// Add to AdminPage.jsx: import AdminEmailTool from '../components/AdminEmailTool';

import { useState } from "react";
import { useUser } from "@clerk/clerk-react";

const TEMPLATES = {
  welcome: {
    subject: "Welcome to pFPL — Your AI FPL Assistant 🚀",
    html: `<h2>Welcome to pFPL, {{name}}!</h2>
<p>You now have access to AI-powered FPL analysis. Here's how to get started:</p>
<ul>
  <li>🔗 Link your FPL team ID in your dashboard</li>
  <li>⚡ Run a Quick Optimise to get instant transfer recommendations</li>
  <li>📊 Check the Injury Report for the latest player news</li>
</ul>
<p>Good luck this week!</p>
<p>— The pFPL Team</p>`,
  },
  upgrade: {
    subject: "Unlock Pro Features on pFPL ⚡",
    html: `<h2>Hey {{name}},</h2>
<p>Upgrade to pFPL Pro and get:</p>
<ul>
  <li>✅ Unlimited AI queries</li>
  <li>✅ Advanced GW planning</li>
  <li>✅ Captain & transfer confidence scores</li>
  <li>✅ Priority support</li>
</ul>
<p><a href="https://predictivefpl.com/pricing">Upgrade now →</a></p>`,
  },
  gw_tip: {
    subject: "GW Tip from pFPL 🎯",
    html: `<h2>Hey {{name}},</h2>
<p>Quick tip heading into this gameweek:</p>
<p>[Write your tip here]</p>
<p>Good luck!</p>
<p>— pFPL</p>`,
  },
  blank: { subject: "", html: "" },
};

const inputStyle = {
  width: "100%", background: "var(--card-bg, #1a1a2e)",
  border: "1px solid var(--border, #333)", borderRadius: 8,
  padding: "10px 14px", color: "var(--text-primary, #fff)",
  fontSize: "0.9rem", boxSizing: "border-box",
};

export default function AdminEmailTool() {
  const { user } = useUser();
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [segment, setSegment] = useState("all");
  const [template, setTemplate] = useState("blank");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("compose"); // compose | preview | history

  const applyTemplate = (key) => {
    setTemplate(key);
    setSubject(TEMPLATES[key].subject);
    setHtmlBody(TEMPLATES[key].html);
  };

  const doPreview = async () => {
    setLoading(true);
    setPreview(null);
    try {
      const res = await fetch("/api/admin-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, htmlBody, segment, preview: true, adminUserId: user.id }),
      });
      const data = await res.json();
      setPreview(data);
      setTab("preview");
    } catch (e) {
      alert("Preview failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const doSend = async () => {
    if (!subject || !htmlBody) return alert("Subject and body are required");
    if (!window.confirm(`Send to ${preview?.recipientCount || "all"} users? This cannot be undone.`)) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, htmlBody, segment, preview: false, adminUserId: user.id }),
      });
      const data = await res.json();
      setResult(data);
      setTab("preview");
    } catch (e) {
      alert("Send failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: "var(--card-bg, #1a1a2e)",
      border: "1px solid var(--border, #2a2a3e)",
      borderRadius: 14, overflow: "hidden",
      marginTop: 24,
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        background: "var(--card-header-bg, #12122a)",
        borderBottom: "1px solid var(--border, #2a2a3e)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.2rem" }}>📧</span>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary, #fff)" }}>
            Email Marketing
          </h3>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 6 }}>
          {["compose", "preview"].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "5px 14px", borderRadius: 6, border: "1px solid var(--border, #333)",
              background: tab === t ? "var(--accent, #6366f1)" : "transparent",
              color: tab === t ? "#fff" : "var(--text-muted, #888)",
              fontSize: "0.8rem", fontWeight: tab === t ? 700 : 400, cursor: "pointer",
            }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {tab === "compose" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Templates */}
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted, #888)", fontWeight: 600, display: "block", marginBottom: 8 }}>
                TEMPLATE
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.keys(TEMPLATES).map((k) => (
                  <button key={k} onClick={() => applyTemplate(k)} style={{
                    padding: "6px 14px", borderRadius: 6,
                    border: `1px solid ${template === k ? "var(--accent, #6366f1)" : "var(--border, #333)"}`,
                    background: template === k ? "rgba(99,102,241,0.15)" : "transparent",
                    color: template === k ? "var(--accent, #6366f1)" : "var(--text-muted, #888)",
                    fontSize: "0.8rem", cursor: "pointer", fontWeight: 600, textTransform: "capitalize",
                  }}>
                    {k === "gw_tip" ? "GW Tip" : k.charAt(0).toUpperCase() + k.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Segment */}
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted, #888)", fontWeight: 600, display: "block", marginBottom: 8 }}>
                SEND TO
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {["all", "pro", "free"].map((s) => (
                  <button key={s} onClick={() => setSegment(s)} style={{
                    padding: "6px 16px", borderRadius: 6,
                    border: `1px solid ${segment === s ? "var(--accent, #6366f1)" : "var(--border, #333)"}`,
                    background: segment === s ? "rgba(99,102,241,0.15)" : "transparent",
                    color: segment === s ? "var(--accent, #6366f1)" : "var(--text-muted, #888)",
                    fontSize: "0.82rem", cursor: "pointer", fontWeight: 600, textTransform: "capitalize",
                  }}>
                    {s === "all" ? "🌐 All Users" : s === "pro" ? "⭐ Pro Only" : "🆓 Free Only"}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted, #888)", fontWeight: 600, display: "block", marginBottom: 8 }}>
                SUBJECT LINE
              </label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject..." style={inputStyle} />
            </div>

            {/* Body */}
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted, #888)", fontWeight: 600, display: "block", marginBottom: 8 }}>
                HTML BODY <span style={{ fontWeight: 400 }}>(use {"{{name}}"} for personalisation)</span>
              </label>
              <textarea
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                rows={12}
                placeholder="<h2>Hello {{name}},</h2>..."
                style={{ ...inputStyle, fontFamily: "monospace", fontSize: "0.82rem", resize: "vertical" }}
              />
            </div>

            {/* Preview rendered HTML */}
            {htmlBody && (
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted, #888)", fontWeight: 600, display: "block", marginBottom: 8 }}>
                  RENDER PREVIEW
                </label>
                <div
                  style={{
                    background: "#fff", borderRadius: 8, padding: 20,
                    fontSize: "0.9rem", color: "#111", maxHeight: 300, overflow: "auto",
                    border: "1px solid var(--border, #2a2a3e)",
                  }}
                  dangerouslySetInnerHTML={{ __html: htmlBody.replace(/\{\{name\}\}/g, "Test Manager") }}
                />
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
              <button
                onClick={doPreview}
                disabled={loading || !subject || !htmlBody}
                style={{
                  padding: "10px 22px", borderRadius: 8,
                  border: "1px solid var(--accent, #6366f1)",
                  background: "transparent", color: "var(--accent, #6366f1)",
                  fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
                  opacity: loading || !subject || !htmlBody ? 0.5 : 1,
                }}
              >
                {loading ? "Loading..." : "Preview Recipients →"}
              </button>
            </div>
          </div>
        )}

        {tab === "preview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {result ? (
              /* Send result */
              <div style={{
                background: result.failed === 0 ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                border: `1px solid ${result.failed === 0 ? "#22c55e" : "#f59e0b"}`,
                borderRadius: 10, padding: 20,
              }}>
                <h4 style={{ margin: "0 0 10px", color: result.failed === 0 ? "#22c55e" : "#f59e0b", fontSize: "1rem" }}>
                  {result.failed === 0 ? "✅ Emails Sent Successfully!" : "⚠️ Sent with some failures"}
                </h4>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted, #ccc)" }}>
                  Sent: <strong>{result.sent}</strong> · Failed: <strong>{result.failed}</strong> · Total: <strong>{result.total}</strong>
                </p>
                {result.errors?.length > 0 && (
                  <details style={{ marginTop: 10, fontSize: "0.8rem", color: "#ef4444" }}>
                    <summary>View failures ({result.errors.length})</summary>
                    <pre style={{ marginTop: 8, fontSize: "0.75rem" }}>{JSON.stringify(result.errors, null, 2)}</pre>
                  </details>
                )}
              </div>
            ) : preview ? (
              /* Preview result */
              <div>
                <div style={{
                  background: "rgba(99,102,241,0.1)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  borderRadius: 10, padding: 16, marginBottom: 16,
                }}>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-primary, #fff)" }}>
                    📬 Ready to send <strong style={{ color: "var(--accent, #6366f1)" }}>{preview.recipientCount}</strong> emails
                    to <strong>{preview.segment === "all" ? "all users" : `${preview.segment} users`}</strong>
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: "0.8rem", color: "var(--text-muted, #888)" }}>
                    Subject: <em>"{subject}"</em>
                  </p>
                </div>

                {/* Sample recipients */}
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted, #888)", fontWeight: 600, margin: "0 0 8px" }}>
                  SAMPLE RECIPIENTS (first 10)
                </p>
                <div style={{
                  background: "var(--card-header-bg, #12122a)",
                  borderRadius: 8, overflow: "hidden",
                  border: "1px solid var(--border, #2a2a3e)",
                }}>
                  {(preview.recipients || []).map((r, i) => (
                    <div key={i} style={{
                      padding: "9px 14px", display: "flex", gap: 12, alignItems: "center",
                      borderBottom: i < preview.recipients.length - 1 ? "1px solid var(--border, #2a2a3e)" : "none",
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: "var(--accent, #6366f1)", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontSize: "0.75rem", fontWeight: 700, color: "#fff",
                        flexShrink: 0,
                      }}>
                        {r.name?.[0] || "?"}
                      </div>
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary, #fff)" }}>{r.name || "—"}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #888)" }}>{r.email}</div>
                      </div>
                    </div>
                  ))}
                  {preview.recipientCount > 10 && (
                    <div style={{ padding: "9px 14px", fontSize: "0.8rem", color: "var(--text-muted, #888)", fontStyle: "italic" }}>
                      + {preview.recipientCount - 10} more...
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={() => setTab("compose")} style={{
                    padding: "10px 20px", borderRadius: 8, border: "1px solid var(--border, #333)",
                    background: "transparent", color: "var(--text-muted, #888)",
                    fontWeight: 600, fontSize: "0.9rem", cursor: "pointer",
                  }}>
                    ← Edit
                  </button>
                  <button
                    onClick={doSend}
                    disabled={loading}
                    style={{
                      padding: "10px 24px", borderRadius: 8, border: "none",
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      color: "#fff", fontWeight: 700, fontSize: "0.9rem",
                      cursor: "pointer", opacity: loading ? 0.6 : 1,
                    }}
                  >
                    {loading ? "Sending..." : `🚀 Send to ${preview.recipientCount} users`}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted, #888)" }}>
                Compose an email first, then click "Preview Recipients"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
