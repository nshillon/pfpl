// src/components/InjuriesTab.jsx
// Fetches injury data from /api/injuries and displays it cleanly
// Player > Injury Type > Expected Return — compact, information-dense

import { useState, useEffect } from "react";

const STATUS_COLORS = {
  Injured: { bg: "rgba(239,68,68,0.15)", color: "#ef4444", dot: "#ef4444" },
  Doubtful: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", dot: "#f59e0b" },
  Suspended: { bg: "rgba(168,85,247,0.15)", color: "#a855f7", dot: "#a855f7" },
  Unavailable: { bg: "rgba(107,114,128,0.15)", color: "#6b7280", dot: "#6b7280" },
};

const POSITIONS = ["All", "GKP", "DEF", "MID", "FWD"];

export default function InjuriesTab() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/injuries")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPlayers(data.players || []);
        setLastUpdated(data.lastUpdated);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const filtered = players.filter((p) => {
    const matchPos = filter === "All" || p.position === filter;
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.team.toLowerCase().includes(search.toLowerCase());
    return matchPos && matchSearch;
  });

  const fmt = (ts) =>
    ts ? new Date(ts).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div style={{ padding: "0 0 40px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary, #fff)" }}>
            🏥 Injury Report
          </h2>
          {lastUpdated && (
            <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "var(--text-muted, #888)" }}>
              Updated {fmt(lastUpdated)} · Cached 1hr
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Search */}
          <input
            placeholder="Search player or team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: "var(--card-bg, #1a1a2e)",
              border: "1px solid var(--border, #333)",
              borderRadius: 8,
              padding: "7px 12px",
              color: "var(--text-primary, #fff)",
              fontSize: "0.85rem",
              width: 200,
            }}
          />
          {/* Position filter */}
          <div style={{ display: "flex", gap: 4 }}>
            {POSITIONS.map((pos) => (
              <button
                key={pos}
                onClick={() => setFilter(pos)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--border, #333)",
                  background: filter === pos ? "var(--accent, #6366f1)" : "transparent",
                  color: filter === pos ? "#fff" : "var(--text-muted, #888)",
                  fontSize: "0.8rem",
                  fontWeight: filter === pos ? 700 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary badges */}
      {!loading && !error && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {Object.entries(STATUS_COLORS).map(([status, style]) => {
            const count = players.filter((p) => p.status === status).length;
            if (!count) return null;
            return (
              <div
                key={status}
                onClick={() => {}}
                style={{
                  background: style.bg,
                  border: `1px solid ${style.color}33`,
                  borderRadius: 8,
                  padding: "6px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "0.82rem",
                  color: style.color,
                  fontWeight: 600,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: style.dot, display: "inline-block" }} />
                {count} {status}
              </div>
            );
          })}
        </div>
      )}

      {/* State: loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted, #888)" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div>
          <p>Fetching latest injury data...</p>
        </div>
      )}

      {/* State: error */}
      {error && (
        <div style={{ textAlign: "center", padding: 40, color: "#ef4444" }}>
          <p>⚠️ {error}</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div style={{
          background: "var(--card-bg, #1a1a2e)",
          borderRadius: 12,
          border: "1px solid var(--border, #2a2a3e)",
          overflow: "hidden",
        }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "2fr 0.7fr 0.7fr 1fr 1.5fr 0.8fr",
            padding: "10px 16px",
            background: "var(--card-header-bg, #12122a)",
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "var(--text-muted, #888)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            borderBottom: "1px solid var(--border, #2a2a3e)",
          }}>
            <span>Player</span>
            <span>Team</span>
            <span>Pos</span>
            <span>Status</span>
            <span>News / Return</span>
            <span style={{ textAlign: "right" }}>Sel%</span>
          </div>

          {/* Rows */}
          {filtered.length === 0 && (
            <div style={{ padding: 30, textAlign: "center", color: "var(--text-muted, #888)", fontSize: "0.9rem" }}>
              No players match your filters
            </div>
          )}
          {filtered.map((p, i) => {
            const s = STATUS_COLORS[p.status] || STATUS_COLORS.Unavailable;
            const chance = p.chanceNextRound;
            return (
              <div
                key={p.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 0.7fr 0.7fr 1fr 1.5fr 0.8fr",
                  padding: "11px 16px",
                  borderBottom: i < filtered.length - 1 ? "1px solid var(--border, #2a2a3e)" : "none",
                  alignItems: "center",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {/* Player name + price */}
                <div>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary, #fff)" }}>
                    {p.webName}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted, #888)", marginLeft: 6 }}>
                    £{p.price}m
                  </span>
                </div>

                {/* Team */}
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted, #ccc)", fontWeight: 500 }}>
                  {p.team}
                </span>

                {/* Position */}
                <span style={{
                  fontSize: "0.72rem", fontWeight: 700, padding: "2px 7px",
                  borderRadius: 4, background: "rgba(255,255,255,0.08)",
                  color: "var(--text-primary, #fff)", width: "fit-content",
                }}>
                  {p.position}
                </span>

                {/* Status badge */}
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: s.bg, borderRadius: 6,
                  padding: "3px 9px", width: "fit-content",
                  fontSize: "0.75rem", fontWeight: 600, color: s.color,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
                  {p.status}
                  {chance !== null && chance !== undefined && (
                    <span style={{ opacity: 0.7 }}>({chance}%)</span>
                  )}
                </div>

                {/* News / Return */}
                <div>
                  {p.expectedReturn && (
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--accent, #6366f1)", marginBottom: 2 }}>
                      Return: {p.expectedReturn}
                    </div>
                  )}
                  <div style={{
                    fontSize: "0.76rem", color: "var(--text-muted, #999)",
                    overflow: "hidden", display: "-webkit-box",
                    WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    lineHeight: 1.4,
                  }}>
                    {p.news}
                  </div>
                </div>

                {/* Selected by */}
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted, #ccc)", textAlign: "right" }}>
                  {p.selectedBy}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ fontSize: "0.72rem", color: "var(--text-muted, #666)", marginTop: 12, textAlign: "center" }}>
        Source: official FPL API · Refreshed hourly · {filtered.length} players shown
      </p>
    </div>
  );
}
