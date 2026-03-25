// src/components/OpponentTeamModal.jsx
// Shows opponent's team in a pitch view popup when name is clicked in Leagues & Cups
// Usage:
//   import OpponentTeamModal from './OpponentTeamModal';
//   <OpponentTeamModal entryId={123} managerName="John" onClose={() => setOpen(false)} />

import { useState, useEffect, useRef } from "react";

const POSITION_LAYOUT = {
  // [row, slot] for 4-4-2 / 4-3-3 / 3-5-2 etc — we'll auto-layout by element_type
  GKP: { row: 0, cols: 1 },
  DEF: { row: 1, cols: 5 },
  MID: { row: 2, cols: 5 },
  FWD: { row: 3, cols: 3 },
};

const ELEMENT_TYPES = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };
const SHIRT_COLORS = ["#e63946", "#457b9d", "#2a9d8f", "#e9c46a", "#f4a261", "#264653", "#8338ec", "#3a86ff"];

export default function OpponentTeamModal({ entryId, managerName, gameweek, onClose }) {
  const [picks, setPicks] = useState([]);
  const [playerMap, setPlayerMap] = useState({});
  const [teamMap, setTeamMap] = useState({});
  const [entryInfo, setEntryInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!entryId) return;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        // Fetch bootstrap (player + team data) — via your CORS proxy
        const [bootstrapRes, picksRes, entryRes] = await Promise.all([
          fetch("/api/fpl?path=bootstrap-static/"),
          fetch(`/api/fpl?path=entry/${entryId}/event/${gameweek}/picks/`),
          fetch(`/api/fpl?path=entry/${entryId}/`),
        ]);

        const [bootstrap, picksData, entry] = await Promise.all([
          bootstrapRes.json(),
          picksRes.json(),
          entryRes.json(),
        ]);

        // Build lookups
        const pMap = {};
        for (const p of bootstrap.elements || []) pMap[p.id] = p;
        const tMap = {};
        for (const t of bootstrap.teams || []) tMap[t.id] = { name: t.name, short: t.short_name, code: t.code };

        setPlayerMap(pMap);
        setTeamMap(tMap);
        setPicks(picksData.picks || []);
        setEntryInfo(entry);
        setLoading(false);
      } catch (e) {
        setError("Could not load team data");
        setLoading(false);
      }
    }

    load();
  }, [entryId, gameweek]);

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Group picks by position (first 11 = starting, rest = bench)
  const starting = picks.filter((p) => p.position <= 11);
  const bench = picks.filter((p) => p.position > 11);

  const byType = { GKP: [], DEF: [], MID: [], FWD: [] };
  for (const pick of starting) {
    const player = playerMap[pick.element];
    if (!player) continue;
    const pos = ELEMENT_TYPES[player.element_type];
    byType[pos]?.push({ pick, player });
  }

  const captainId = picks.find((p) => p.is_captain)?.element;
  const vcId = picks.find((p) => p.is_vice_captain)?.element;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div style={{
        background: "var(--modal-bg, #0f0f1e)",
        border: "1px solid var(--border, #2a2a3e)",
        borderRadius: 16,
        width: "100%", maxWidth: 540,
        maxHeight: "92vh",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
        boxShadow: "0 25px 80px rgba(0,0,0,0.6)",
      }}>
        {/* Modal Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border, #2a2a3e)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "var(--card-header-bg, #12122a)",
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary, #fff)" }}>
              {entryInfo?.name || managerName || "Opponent's Team"}
            </h3>
            {entryInfo && (
              <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: "var(--text-muted, #888)" }}>
                {entryInfo.player_first_name} {entryInfo.player_last_name}
                {entryInfo.summary_overall_points != null && (
                  <span style={{ marginLeft: 10, color: "var(--accent, #6366f1)", fontWeight: 600 }}>
                    {entryInfo.summary_overall_points} pts
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)", border: "none",
              borderRadius: 8, width: 32, height: 32,
              color: "var(--text-muted, #888)", cursor: "pointer",
              fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ overflow: "auto", flex: 1 }}>
          {loading && (
            <div style={{ padding: 50, textAlign: "center", color: "var(--text-muted, #888)" }}>
              <div style={{ fontSize: "2rem", marginBottom: 10 }}>⏳</div>
              Loading team...
            </div>
          )}
          {error && (
            <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>{error}</div>
          )}

          {!loading && !error && (
            <>
              {/* Pitch */}
              <div style={{
                background: "linear-gradient(180deg, #1a5c2a 0%, #1e6b30 25%, #1a5c2a 50%, #1e6b30 75%, #1a5c2a 100%)",
                padding: "16px 12px",
                position: "relative",
                minHeight: 380,
              }}>
                {/* Pitch lines */}
                <div style={{
                  position: "absolute", inset: 0, opacity: 0.15,
                  backgroundImage: `
                    linear-gradient(transparent 49.5%, rgba(255,255,255,0.5) 49.5%, rgba(255,255,255,0.5) 50.5%, transparent 50.5%),
                    radial-gradient(circle at 50% 50%, transparent 15%, rgba(255,255,255,0.5) 15.5%, rgba(255,255,255,0.5) 16%, transparent 16%)
                  `,
                }} />

                {["GKP", "DEF", "MID", "FWD"].map((pos) => (
                  <div key={pos} style={{
                    display: "flex", justifyContent: "center",
                    gap: "clamp(8px, 3vw, 20px)",
                    marginBottom: pos === "FWD" ? 0 : 12,
                    position: "relative", zIndex: 1,
                  }}>
                    {(byType[pos] || []).map(({ pick, player }) => {
                      const isCap = player.id === captainId;
                      const isVC = player.id === vcId;
                      const teamColor = SHIRT_COLORS[(player.team - 1) % SHIRT_COLORS.length];
                      const tm = teamMap[player.team];

                      return (
                        <div key={player.id} style={{
                          display: "flex", flexDirection: "column",
                          alignItems: "center", gap: 4, width: 64,
                        }}>
                          {/* Shirt */}
                          <div style={{ position: "relative" }}>
                            <div style={{
                              width: 42, height: 42, borderRadius: "50% 50% 40% 40% / 45% 45% 55% 55%",
                              background: teamColor,
                              border: "2px solid rgba(255,255,255,0.3)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "0.65rem", fontWeight: 700, color: "#fff",
                              boxShadow: "0 3px 8px rgba(0,0,0,0.4)",
                            }}>
                              {tm?.short || "?"}
                            </div>
                            {(isCap || isVC) && (
                              <div style={{
                                position: "absolute", top: -6, right: -6,
                                width: 16, height: 16, borderRadius: "50%",
                                background: isCap ? "#fbbf24" : "#94a3b8",
                                border: "2px solid #0f0f1e",
                                fontSize: "0.6rem", fontWeight: 900, color: "#000",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                {isCap ? "C" : "V"}
                              </div>
                            )}
                          </div>
                          {/* Name */}
                          <div style={{
                            background: "rgba(0,0,0,0.65)", borderRadius: 4,
                            padding: "2px 5px", maxWidth: 60, textAlign: "center",
                          }}>
                            <div style={{
                              fontSize: "0.65rem", fontWeight: 600, color: "#fff",
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            }}>
                              {player.web_name}
                            </div>
                            {pick.multiplier > 1 && (
                              <div style={{ fontSize: "0.6rem", color: "#fbbf24" }}>
                                ×{pick.multiplier}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Bench */}
              {bench.length > 0 && (
                <div style={{
                  background: "var(--card-bg, #1a1a2e)",
                  padding: "12px 16px",
                  borderTop: "1px solid var(--border, #2a2a3e)",
                }}>
                  <p style={{ margin: "0 0 10px", fontSize: "0.72rem", color: "var(--text-muted, #888)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Bench
                  </p>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {bench.map((pick) => {
                      const player = playerMap[pick.element];
                      if (!player) return null;
                      const tm = teamMap[player.team];
                      const teamColor = SHIRT_COLORS[(player.team - 1) % SHIRT_COLORS.length];
                      return (
                        <div key={player.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: "50% 50% 40% 40% / 45% 45% 55% 55%",
                            background: teamColor, opacity: 0.7,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.5rem", fontWeight: 700, color: "#fff", border: "1px solid rgba(255,255,255,0.2)",
                          }}>
                            {tm?.short || "?"}
                          </div>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #aaa)" }}>
                            {player.web_name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
