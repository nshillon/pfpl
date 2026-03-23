import { useState, useEffect, useRef } from "react";

// ─── Design Tokens ───────────────────────────────────────────────────────────
const C = {
  bg:         "#080C14",
  surface:    "#0D1520",
  card:       "#111927",
  border:     "#1E2D40",
  accent:     "#00E5FF",
  accentDim:  "#00E5FF22",
  accentGlow: "#00E5FF44",
  green:      "#00FF87",
  greenDim:   "#00FF8722",
  amber:      "#FFB800",
  amberDim:   "#FFB80022",
  red:        "#FF4C6A",
  redDim:     "#FF4C6A22",
  text:       "#E8F0FE",
  muted:      "#5A7A9A",
  dim:        "#3A5A7A",
};

// ─── FPL API ─────────────────────────────────────────────────────────────────
async function fetchFPL(path) {
  const res = await fetch(`/api/fpl?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`FPL API error: ${res.status}`);
  return res.json();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const POSITIONS = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };
const POS_COLOR = { GKP: "#FFB800", DEF: "#00C853", MID: "#2979FF", FWD: "#FF4C6A" };

function fdrColor(fdr) {
  return ["", C.green, "#8BC34A", C.amber, "#FF7043", C.red][fdr] || C.muted;
}

function predictPoints(player, fixtures) {
  // Simple prediction model: form × fixture modifier
  const form = parseFloat(player.form) || 0;
  const fdr = fixtures?.[0]?.difficulty || 3;
  const fdrMod = [0, 1.4, 1.2, 1.0, 0.7, 0.4][fdr];
  const base = form * fdrMod;
  // Bonus for clean sheet potential
  const pos = POSITIONS[player.element_type];
  const csBonus = (pos === "GKP" || pos === "DEF") ? 1.5 : pos === "MID" ? 0.5 : 0;
  return Math.max(1, Math.round((base + csBonus) * 10) / 10);
}

// ─── Login Screen ────────────────────────────────────────────────────────────
function LoginScreen({ onAuth }) {
  const [user, setUser]   = useState("");
  const [pass, setPass]   = useState("");
  const [error, setError] = useState("");

  const attempt = () => {
    if (
      user.trim() === (import.meta.env.VITE_ADMIN_USER ?? "").trim() &&
      pass === (import.meta.env.VITE_ADMIN_PASS ?? "").trim()
    ) {
      sessionStorage.setItem("pfpl_auth", "1");
      onAuth();
    } else {
      setError("Incorrect username or password.");
      setPass("");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      fontFamily: "'DM Sans', sans-serif", color: C.text,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "0 20px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=DM+Sans:wght@400;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes glow { 0%,100% { box-shadow: 0 0 20px ${C.accentGlow}; } 50% { box-shadow: 0 0 40px ${C.accent}55; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        input, button { font-family: inherit; outline: none; border: none; cursor: pointer; }
      `}</style>

      <div style={{ width: "100%", maxWidth: 360, animation: "fadeUp 0.5s ease" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "baseline", gap: 0, marginBottom: 8 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 48, fontWeight: 900, color: C.text, letterSpacing: "-0.02em" }}>p</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 48, fontWeight: 900, color: C.accent }}>FPL!</span>
          </div>
          <p style={{ fontSize: 12, color: C.muted, letterSpacing: "0.1em" }}>SIGN IN TO CONTINUE</p>
        </div>

        {/* Card */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: 24,
        }}>
          <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: "0.12em", display: "block", marginBottom: 6 }}>
            USERNAME
          </label>
          <input
            value={user}
            onChange={e => setUser(e.target.value)}
            onKeyDown={e => e.key === "Enter" && attempt()}
            autoComplete="username"
            style={{
              width: "100%", background: C.surface,
              border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "11px 14px", fontSize: 15, color: C.text,
              marginBottom: 14,
            }}
          />

          <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: "0.12em", display: "block", marginBottom: 6 }}>
            PASSWORD
          </label>
          <input
            type="password"
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === "Enter" && attempt()}
            autoComplete="current-password"
            style={{
              width: "100%", background: C.surface,
              border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "11px 14px", fontSize: 15, color: C.text,
              marginBottom: error ? 12 : 20,
            }}
          />

          {error && (
            <div style={{
              background: C.redDim, border: `1px solid ${C.red}44`,
              borderRadius: 6, padding: "8px 12px",
              fontSize: 11, color: C.red, marginBottom: 14,
            }}>{error}</div>
          )}

          <button
            onClick={attempt}
            style={{
              width: "100%", background: C.accent, color: C.bg,
              borderRadius: 8, padding: 14,
              fontSize: 14, fontWeight: 900,
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: "0.1em",
              animation: "glow 2.5s ease infinite",
            }}
          >
            SIGN IN →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function Pill({ color = "accent", children }) {
  const map = {
    green:  [C.green,  C.greenDim],
    amber:  [C.amber,  C.amberDim],
    red:    [C.red,    C.redDim],
    accent: [C.accent, C.accentDim],
  };
  const [fg, bg] = map[color];
  return (
    <span style={{
      background: bg, color: fg, border: `1px solid ${fg}44`,
      borderRadius: 4, fontSize: 9, fontWeight: 800, padding: "2px 7px",
      letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function StatBar({ value, max = 10, color = C.accent }) {
  return (
    <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: "hidden", width: "100%" }}>
      <div style={{
        height: "100%", width: `${Math.min(100, (value / max) * 100)}%`,
        background: color, borderRadius: 2, transition: "width 1.2s ease",
      }} />
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 14, height: 14,
      border: `2px solid ${C.dim}`, borderTopColor: C.accent,
      borderRadius: "50%", display: "inline-block",
      animation: "spin 0.7s linear infinite",
    }} />
  );
}

function PlayerRow({ player, rank }) {
  const pos = POSITIONS[player.element_type];
  const isBlank = !player.nextFixture;
  const isCaptain = player.is_captain;
  const isVice = player.is_vice_captain;
  const hasDoubt = player.chance_of_playing_next_round !== null &&
                   player.chance_of_playing_next_round < 100;

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${isCaptain ? C.accent : isVice ? C.green : C.border}`,
      borderRadius: 8, padding: "10px 12px",
      display: "flex", alignItems: "center", gap: 10,
      opacity: player.isBench ? 0.6 : 1,
      position: "relative",
      boxShadow: isCaptain ? `0 0 18px ${C.accentGlow}` : "none",
      marginBottom: 6,
    }}>
      {isCaptain && (
        <div style={{
          position: "absolute", top: -8, left: 12,
          background: C.accent, color: C.bg,
          fontSize: 9, fontWeight: 900, padding: "1px 7px",
          borderRadius: 3, letterSpacing: "0.1em",
        }}>CAPTAIN</div>
      )}
      {isVice && (
        <div style={{
          position: "absolute", top: -8, left: 12,
          background: C.green, color: C.bg,
          fontSize: 9, fontWeight: 900, padding: "1px 7px",
          borderRadius: 3, letterSpacing: "0.1em",
        }}>VICE C</div>
      )}

      {/* Position badge */}
      <div style={{
        width: 34, height: 34, borderRadius: 6, flexShrink: 0,
        background: POS_COLOR[pos] + "22", border: `1px solid ${POS_COLOR[pos]}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 900, color: POS_COLOR[pos], letterSpacing: "0.05em",
      }}>{pos}</div>

      {/* Name + fixture */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 15, fontWeight: 700, color: C.text,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{player.web_name}</span>
          {hasDoubt && <Pill color="amber">{player.chance_of_playing_next_round}%</Pill>}
          {isBlank && <Pill color="red">BLANK</Pill>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
            background: fdrColor(player.nextFixtureDifficulty || 3),
          }} />
          <span style={{ fontSize: 10, color: isBlank ? C.red : C.muted }}>
            {player.nextFixture || "No fixture GW" + (player.gameweek || "")}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 9, color: C.dim, minWidth: 26 }}>Form</span>
          <div style={{ flex: 1 }}>
            <StatBar
              value={parseFloat(player.form) || 0}
              max={10}
              color={parseFloat(player.form) >= 5 ? C.green : parseFloat(player.form) >= 3 ? C.amber : C.red}
            />
          </div>
          <span style={{ fontSize: 9, color: C.muted, minWidth: 18, textAlign: "right" }}>{player.form}</span>
        </div>
      </div>

      {/* Predicted points */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 22, fontWeight: 900, lineHeight: 1,
          color: isBlank ? C.red : isCaptain ? C.accent : C.text,
        }}>
          {isBlank ? "–" : player.predictedPoints}
        </div>
        <div style={{ fontSize: 9, color: C.muted, marginTop: 1, letterSpacing: "0.06em" }}>PRED</div>
      </div>
    </div>
  );
}

function TransferCard({ t, i }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "14px 16px", marginBottom: 10,
      animation: `fadeUp 0.4s ease ${i * 0.1}s both`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: C.red, fontWeight: 800, letterSpacing: "0.12em", marginBottom: 3 }}>SELL</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 800, color: C.text }}>{t.outName}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{t.outTeam} · £{t.outPrice}m</div>
        </div>
        <div style={{ fontSize: 22, color: C.dim, fontWeight: 300 }}>→</div>
        <div style={{ flex: 1, textAlign: "right" }}>
          <div style={{ fontSize: 10, color: C.green, fontWeight: 800, letterSpacing: "0.12em", marginBottom: 3 }}>BUY</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 800, color: C.text }}>{t.inName}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{t.inTeam} · £{t.inPrice}m</div>
        </div>
      </div>
      <div style={{
        background: C.surface, borderRadius: 6, padding: "8px 10px",
        fontSize: 11, color: C.muted, lineHeight: 1.55, marginBottom: 10,
      }}>{t.reason}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Pill color="green">{t.gain}</Pill>
          <Pill color={t.saving >= 0 ? "green" : "amber"}>
            {t.saving >= 0 ? `+£${t.saving}m` : `£${Math.abs(t.saving)}m cost`}
          </Pill>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 10, color: C.muted }}>Confidence</span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 900,
            color: t.conf >= 80 ? C.green : C.amber,
          }}>{t.conf}%</span>
        </div>
      </div>
    </div>
  );
}

function CaptainCard({ pick, isTop, i }) {
  return (
    <div style={{
      background: isTop ? `linear-gradient(135deg, ${C.card}, ${C.accentDim})` : C.card,
      border: `1px solid ${isTop ? C.accent : C.border}`,
      borderRadius: 10, padding: "14px 16px", marginBottom: 10,
      boxShadow: isTop ? `0 4px 28px ${C.accentGlow}` : "none",
      animation: `fadeUp 0.4s ease ${i * 0.12}s both`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 5 }}>
            {isTop && <Pill color="accent">TOP PICK</Pill>}
            {pick.doubt && <Pill color="amber">Doubt</Pill>}
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 24, fontWeight: 900, color: C.text, lineHeight: 1,
          }}>{pick.name}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            {pick.team} · {pick.fixture}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            Form: {pick.form} · Owned: {pick.ownership}%
          </div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 42, fontWeight: 900, lineHeight: 1,
            color: isTop ? C.accent : C.text,
          }}>{pick.predicted}</div>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: "0.1em" }}>PRED PTS</div>
          <div style={{ fontSize: 12, color: pick.conf >= 75 ? C.green : C.amber, fontWeight: 700, marginTop: 4 }}>
            {pick.conf}% conf.
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <StatBar value={pick.conf} max={100} color={isTop ? C.accent : C.green} />
      </div>
    </div>
  );
}

// ─── Transfer Planner Tab ─────────────────────────────────────────────────────
function TransferPlannerTab({ transfers, gw }) {
  const [count, setCount] = useState(1);
  const shown = transfers.slice(0, count);

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.14em", fontWeight: 700, marginBottom: 14 }}>
        AI TRANSFER PLANNER — GW{gw}
      </div>

      {/* Count selector */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>
          HOW MANY TRANSFERS?
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setCount(n)}
              style={{
                flex: 1, padding: "11px 0", borderRadius: 8,
                fontSize: 18, fontWeight: 900,
                fontFamily: "'Barlow Condensed', sans-serif",
                background: count === n ? C.accent : C.card,
                color: count === n ? C.bg : C.muted,
                border: `1px solid ${count === n ? C.accent : C.border}`,
                transition: "all 0.15s",
              }}
            >{n}</button>
          ))}
        </div>
        {count >= 2 && (
          <div style={{ fontSize: 10, color: C.amber, marginTop: 7, letterSpacing: "0.05em" }}>
            ⚠️ {count} transfers = {count - 1} point hit this gameweek
          </div>
        )}
      </div>

      {/* Transfer cards */}
      {shown.map((t, i) => (
        <div key={i} style={{
          background: C.card, border: `1px solid ${i === 0 ? C.accent + "55" : C.border}`,
          borderRadius: 10, padding: "14px 16px", marginBottom: 10,
          animation: `fadeUp 0.4s ease ${i * 0.08}s both`,
        }}>
          {/* Rank label */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
              background: i === 0 ? C.accent : C.border,
              color: i === 0 ? C.bg : C.muted,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 900,
            }}>{i + 1}</div>
            <span style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: "0.1em" }}>
              TRANSFER {i + 1}{i === 0 ? " — PRIORITY" : ""}
            </span>
          </div>

          {/* OUT → IN */}
          <div style={{ display: "flex", alignItems: "stretch", gap: 8, marginBottom: 12 }}>
            <div style={{
              flex: 1, background: C.redDim, border: `1px solid ${C.red}33`,
              borderRadius: 8, padding: "10px 12px",
            }}>
              <div style={{ fontSize: 9, color: C.red, fontWeight: 800, letterSpacing: "0.12em", marginBottom: 4 }}>SELL</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>{t.outName}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{t.outTeam} · £{t.outPrice}m</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", fontSize: 18, color: C.dim }}>→</div>
            <div style={{
              flex: 1, background: C.greenDim, border: `1px solid ${C.green}33`,
              borderRadius: 8, padding: "10px 12px",
            }}>
              <div style={{ fontSize: 9, color: C.green, fontWeight: 800, letterSpacing: "0.12em", marginBottom: 4 }}>BUY</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>{t.inName}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{t.inTeam} · £{t.inPrice}m</div>
            </div>
          </div>

          {/* Reasoning */}
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.65, marginBottom: 12 }}>{t.reason}</div>

          {/* Confidence */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: C.muted }}>Confidence</span>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 900, color: t.conf >= 80 ? C.green : C.amber }}>{t.conf}%</span>
          </div>
          <StatBar value={t.conf} max={100} color={t.conf >= 80 ? C.green : C.amber} />

          {/* Pts gain */}
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, color: C.muted }}>Expected pts gain</span>
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 900, color: C.accent }}>{t.gain}</span>
          </div>
        </div>
      ))}

      {/* Not enough suggestions */}
      {shown.length < count && (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "12px 16px", textAlign: "center",
          fontSize: 12, color: C.muted, marginBottom: 10,
        }}>
          Only {transfers.length} transfer{transfers.length !== 1 ? "s" : ""} suggested — your other starters look solid this GW.
        </div>
      )}

      <div style={{
        background: C.surface, borderRadius: 8, padding: "10px 14px",
        fontSize: 11, color: C.muted, lineHeight: 1.6, marginTop: 4,
      }}>
        💡 Always check the official FPL site for the latest injury news before the deadline.
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("pfpl_auth") === "1");
  const [tab, setTab]           = useState("squad");
  const [teamId, setTeamId]     = useState("");
  const [loaded, setLoaded]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [data, setData]         = useState(null);   // { manager, players, transfers, captains, gw, bank }
  const [aiText, setAiText]     = useState("");
  const [aiLoading, setAiLoad]  = useState(false);
  const [predTotal, setPredTotal] = useState(0);
  const inputRef = useRef(null);

  // Animate predicted total counter
  useEffect(() => {
    if (!data) return;
    const target = data.players
      .filter(p => !p.isBench && !p.isBlank)
      .reduce((s, p) => s + (p.predictedPoints || 0), 0);
    let v = 0;
    const iv = setInterval(() => {
      v += Math.ceil(target / 25);
      if (v >= target) { setPredTotal(target); clearInterval(iv); }
      else setPredTotal(v);
    }, 35);
    return () => clearInterval(iv);
  }, [data]);

  // ── Load team from FPL API ──
  const loadTeam = async () => {
    const id = teamId.trim();
    if (!id || isNaN(id)) { setError("Please enter a valid numeric Team ID."); return; }
    setError(""); setLoading(true);

    try {
      // Fetch bootstrap (all player data) and team picks in parallel
      const [bootstrap, picks, history] = await Promise.all([
        fetchFPL("/bootstrap-static/"),
        fetchFPL(`/entry/${id}/event/${await getCurrentGW()}/picks/`),
        fetchFPL(`/entry/${id}/`),
      ]);

      const gw = picks.active_chip ? picks.entry_history.event : picks.entry_history.event;
      const bank = picks.entry_history.bank / 10;

      // Build player lookup
      const playerMap = {};
      const teamMap   = {};
      bootstrap.teams.forEach(t => { teamMap[t.id] = t.short_name; });
      bootstrap.elements.forEach(p => { playerMap[p.id] = p; });

      // Get fixtures for current GW
      const fixturesRaw = await fetchFPL(`/fixtures/?event=${gw}`);
      const fixturesByTeam = {};
      fixturesRaw.forEach(f => {
        if (!fixturesByTeam[f.team_h]) fixturesByTeam[f.team_h] = [];
        if (!fixturesByTeam[f.team_a]) fixturesByTeam[f.team_a] = [];
        fixturesByTeam[f.team_h].push({ opponent: teamMap[f.team_a], home: true,  difficulty: f.team_h_difficulty });
        fixturesByTeam[f.team_a].push({ opponent: teamMap[f.team_h], home: false, difficulty: f.team_a_difficulty });
      });

      // Build enriched players
      const players = picks.picks.map((pick, idx) => {
        const p     = playerMap[pick.element];
        const team  = teamMap[p.team];
        const fix   = fixturesByTeam[p.team]?.[0];
        const isBlank = !fix;
        const pred  = isBlank ? 0 : predictPoints(p, fix ? [fix] : []);

        return {
          ...p,
          pickOrder:            idx,
          isBench:              pick.position > 11,
          is_captain:           pick.is_captain,
          is_vice_captain:      pick.is_vice_captain,
          teamShort:            team,
          nextFixture:          fix ? `vs ${fix.opponent} (${fix.home ? "H" : "A"})` : null,
          nextFixtureDifficulty: fix?.difficulty,
          isBlank,
          predictedPoints:      pred,
        };
      });

      // Sort: GKP, DEF, MID, FWD — bench last
      const posOrder = { 1: 0, 2: 1, 3: 2, 4: 3 };
      players.sort((a, b) => {
        if (a.isBench !== b.isBench) return a.isBench ? 1 : -1;
        return posOrder[a.element_type] - posOrder[b.element_type];
      });

      // Transfer suggestions: find blank/doubt starters with good alternatives
      const starters  = players.filter(p => !p.isBench);
      const allPlayers = bootstrap.elements
        .filter(p => p.status === "a")
        .map(p => ({
          ...p,
          teamShort: teamMap[p.team],
          fix: fixturesByTeam[p.team]?.[0],
          pred: fixturesByTeam[p.team]?.[0]
            ? predictPoints(p, [fixturesByTeam[p.team][0]])
            : 0,
        }))
        .sort((a, b) => b.pred - a.pred);

      const transfers = [];
      const usedCandidateIds = new Set(players.map(p => p.id));
      [...starters]
        .sort((a, b) => {
          const aUrgent = a.isBlank || (a.chance_of_playing_next_round !== null && a.chance_of_playing_next_round < 75);
          const bUrgent = b.isBlank || (b.chance_of_playing_next_round !== null && b.chance_of_playing_next_round < 75);
          if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;
          return (a.predictedPoints || 0) - (b.predictedPoints || 0);
        })
        .slice(0, 5)
        .forEach(out => {
          const pos    = out.element_type;
          const budget = out.now_cost / 10 + bank;
          const candidate = allPlayers.find(
            p => p.element_type === pos &&
                 p.now_cost / 10 <= budget + 0.1 &&
                 !usedCandidateIds.has(p.id)
          );
          if (candidate) {
            usedCandidateIds.add(candidate.id);
            const saving = +(budget - candidate.now_cost / 10 - bank).toFixed(1);
            const isDoubt = out.chance_of_playing_next_round !== null && out.chance_of_playing_next_round < 75;
            transfers.push({
              outName:  out.web_name,
              outTeam:  out.teamShort,
              outPrice: out.now_cost / 10,
              inName:   candidate.web_name,
              inTeam:   candidate.teamShort,
              inPrice:  candidate.now_cost / 10,
              saving:   +(-saving).toFixed(1),
              gain:     `+${(candidate.pred - (out.predictedPoints || 0)).toFixed(1)} pts`,
              reason:   out.isBlank
                ? `${out.web_name} has no fixture in GW${gw}. ${candidate.web_name} has a ${["","great","good","average","tough","very tough"][candidate.fix?.difficulty || 3]} fixture vs ${candidate.fix?.opponent}.`
                : isDoubt
                  ? `${out.web_name} is a fitness doubt (${out.chance_of_playing_next_round}% chance). ${candidate.web_name} is available and in strong form (${candidate.form}).`
                  : `${out.web_name} is underperforming (form ${out.form}). ${candidate.web_name} offers better value at £${candidate.now_cost / 10}m with form ${candidate.form}.`,
              conf: out.isBlank ? 85 : isDoubt ? 72 : 58,
            });
          }
        });

      // Captain picks: top predicted starters
      const captains = starters
        .filter(p => !p.isBlank)
        .sort((a, b) => b.predictedPoints - a.predictedPoints)
        .slice(0, 3)
        .map((p, i) => ({
          name:      p.web_name,
          team:      p.teamShort,
          fixture:   p.nextFixture,
          predicted: p.predictedPoints,
          form:      p.form,
          ownership: p.selected_by_percent,
          conf:      [82, 74, 65][i],
          doubt:     p.chance_of_playing_next_round !== null && p.chance_of_playing_next_round < 100,
        }));

      setData({
        players,
        transfers,
        captains,
        gw,
        bank,
        teamName:    history.name,
        managerName: `${history.player_first_name} ${history.player_last_name}`,
        overallRank: history.summary_overall_rank,
      });
      setLoaded(true);
    } catch (e) {
      console.error(e);
      setError("Couldn't load your team. Check your Team ID and try again. (FPL API may also be temporarily down.)");
    }
    setLoading(false);
  };

  const getCurrentGW = async () => {
    const b = await fetchFPL("/bootstrap-static/");
    const current = b.events.find(e => e.is_current) || b.events.find(e => e.is_next);
    return current?.id || 31;
  };

  // ── AI Insight via Claude ──
  const getAiInsight = async () => {
    if (!data) return;
    setAiLoad(true); setAiText("");
    const blankPlayers = data.players.filter(p => !p.isBench && p.isBlank).map(p => p.web_name);
    const topStarters  = data.players.filter(p => !p.isBench && !p.isBlank)
      .sort((a, b) => b.predictedPoints - a.predictedPoints).slice(0, 5)
      .map(p => `${p.web_name} (${p.nextFixture}, pred ${p.predictedPoints}pts)`);
    const captain = data.players.find(p => p.is_captain)?.web_name;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You are an elite Fantasy Premier League analyst. Give sharp, direct, confident gameweek advice. Use FPL terminology naturally. Be specific, not generic. Max 4 sentences. No bullet points — flowing analysis only.",
          messages: [{
            role: "user",
            content: `GW${data.gw} FPL Analysis for ${data.teamName}:
- Captain: ${captain}
- Blank gameweek players (no fixture): ${blankPlayers.join(", ") || "none"}  
- Top predicted scorers: ${topStarters.join(", ")}
- Free transfers available: 1
- Bank: £${data.bank}m

Give me sharp tactical advice for this gameweek.`,
          }],
        }),
      });
      const json = await res.json();
      setAiText(json.content?.find(b => b.type === "text")?.text || "Analysis unavailable.");
    } catch {
      setAiText("AI analysis temporarily unavailable. Please try again.");
    }
    setAiLoad(false);
  };

  const starters = data?.players.filter(p => !p.isBench) || [];
  const bench    = data?.players.filter(p => p.isBench)  || [];
  const blanks   = starters.filter(p => p.isBlank);

  const TABS = ["squad", "transfers", "planner", "captain", "ai"];
  const TAB_LABELS = { squad: "Squad", transfers: "Transfers", planner: "Planner", captain: "Captain", ai: "AI ⚡" };

  if (!authed) return <LoginScreen onAuth={() => setAuthed(true)} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glow    { 0%,100% { box-shadow: 0 0 20px ${C.accentGlow}; } 50% { box-shadow: 0 0 40px ${C.accent}55; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        input, button { font-family: inherit; outline: none; border: none; cursor: pointer; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        background: `linear-gradient(180deg, ${C.surface}, ${C.bg})`,
        borderBottom: `1px solid ${C.border}`,
        padding: "14px 20px",
        position: "sticky", top: 0, zIndex: 100,
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 0 }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 900, color: C.text, letterSpacing: "-0.02em" }}>p</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 900, color: C.accent }}>FPL</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 900, color: C.accent }}>!</span>
              {loaded && (
                <span style={{ fontSize: 9, color: C.muted, marginLeft: 8, letterSpacing: "0.18em", fontWeight: 600 }}>
                  GW{data.gw}
                </span>
              )}
            </div>
            <span style={{ fontSize: 8, color: C.muted, letterSpacing: "0.16em", fontVariant: "small-caps", fontWeight: 600, textTransform: "lowercase" }}>
              predictive fantasy football
            </span>
          </div>
          {loaded && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{data.teamName}</div>
              <div style={{ fontSize: 10, color: C.muted }}>
                {data.overallRank ? `Rank #${data.overallRank.toLocaleString()}` : data.managerName}
              </div>
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px 100px" }}>

        {/* ── Landing / Load Screen ── */}
        {!loaded && (
          <div style={{ paddingTop: 40, animation: "fadeUp 0.5s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 46, fontWeight: 900, lineHeight: 1, marginBottom: 10,
              }}>
                <span style={{ color: C.text }}>OUTSMART</span><br />
                <span style={{ color: C.accent }}>YOUR GAMEWEEK</span>
              </div>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, maxWidth: 300, margin: "0 auto" }}>
                Real FPL data + AI predictions. Enter your Team ID to get personalised transfer advice, captain picks &amp; points projections.
              </p>
            </div>

            {/* Input card */}
            <div style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 14, padding: 24, marginBottom: 16,
            }}>
              <label style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: "0.12em", display: "block", marginBottom: 8 }}>
                YOUR FPL TEAM ID
              </label>
              <input
                ref={inputRef}
                value={teamId}
                onChange={e => setTeamId(e.target.value)}
                onKeyDown={e => e.key === "Enter" && loadTeam()}
                placeholder="e.g. 1234567"
                style={{
                  width: "100%", background: C.surface,
                  border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: "12px 14px", fontSize: 18, color: C.text,
                  marginBottom: 10,
                }}
              />
              <p style={{ fontSize: 11, color: C.dim, marginBottom: 18, lineHeight: 1.5 }}>
                Find your ID in the FPL URL:<br />
                <span style={{ color: C.muted }}>fantasy.premierleague.com/entry/<strong style={{ color: C.accent }}>XXXXXXX</strong>/event</span>
              </p>
              {error && (
                <div style={{
                  background: C.redDim, border: `1px solid ${C.red}44`,
                  borderRadius: 6, padding: "8px 12px",
                  fontSize: 11, color: C.red, marginBottom: 12,
                }}>{error}</div>
              )}
              <button
                onClick={loadTeam}
                disabled={loading}
                style={{
                  width: "100%", background: loading ? C.border : C.accent,
                  color: loading ? C.muted : C.bg,
                  borderRadius: 8, padding: 14,
                  fontSize: 14, fontWeight: 900,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  letterSpacing: "0.1em",
                  transition: "all 0.2s",
                  animation: loading ? "none" : "glow 2.5s ease infinite",
                }}
              >
                {loading
                  ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Spinner /> LOADING YOUR SQUAD...</span>
                  : "LOAD MY TEAM →"}
              </button>
            </div>

            {/* Feature grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["🎯", "Point Predictions", "Live form + fixture model"],
                ["🔄", "Transfer Picks",    "Auto-detect blanks & doubts"],
                ["👑", "Captain Advice",   "Ranked with confidence %"],
                ["⚡", "Claude AI",         "Personalised GW analysis"],
              ].map(([icon, title, sub]) => (
                <div key={title} style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: 14,
                }}>
                  <div style={{ fontSize: 22, marginBottom: 7 }}>{icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 3 }}>{title}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Loaded Dashboard ── */}
        {loaded && (
          <>
            {/* Stats strip */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, padding: "14px 0 10px", animation: "fadeUp 0.4s ease" }}>
              {[
                ["PRED PTS",  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 900, color: C.accent }}>{predTotal}</span>],
                ["IN BANK",   <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 900, color: C.green }}>£{data.bank}m</span>],
                ["BLANKS",    <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 900, color: blanks.length > 0 ? C.red : C.text }}>{blanks.length}</span>],
                ["FREE XFER", <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 900, color: C.text }}>1</span>],
              ].map(([label, val]) => (
                <div key={label} style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: "10px 8px", textAlign: "center",
                }}>
                  {val}
                  <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.08em", marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Blank GW warning */}
            {blanks.length > 0 && (
              <div style={{
                background: C.redDim, border: `1px solid ${C.red}44`,
                borderRadius: 8, padding: "10px 14px", marginBottom: 12,
                display: "flex", alignItems: "flex-start", gap: 10,
                animation: "fadeUp 0.5s ease",
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.red, marginBottom: 2 }}>
                    BLANK GW{data.gw} ALERT
                  </div>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {blanks.map(p => p.web_name).join(", ")} {blanks.length === 1 ? "has" : "have"} no fixture. Check Transfers tab.
                  </div>
                </div>
              </div>
            )}

            {/* Tab bar */}
            <div style={{
              display: "flex", background: C.surface,
              borderRadius: 10, padding: 4, marginBottom: 14, gap: 2,
            }}>
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, padding: "8px 4px", borderRadius: 7,
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
                  background: tab === t ? C.accent : "transparent",
                  color: tab === t ? C.bg : C.muted,
                  transition: "all 0.18s",
                }}>{TAB_LABELS[t]}</button>
              ))}
            </div>

            {/* ── Squad Tab ── */}
            {tab === "squad" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.14em", fontWeight: 700, marginBottom: 10 }}>STARTING XI</div>
                {starters.map(p => <PlayerRow key={p.id} player={p} />)}
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.14em", fontWeight: 700, margin: "14px 0 10px" }}>BENCH</div>
                {bench.map(p => <PlayerRow key={p.id} player={p} />)}
              </div>
            )}

            {/* ── Transfers Tab ── */}
            {tab === "transfers" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.14em", fontWeight: 700, marginBottom: 12 }}>
                  AI TRANSFER SUGGESTIONS — GW{data.gw}
                </div>
                {data.transfers.length > 0
                  ? data.transfers.map((t, i) => <TransferCard key={i} t={t} i={i} />)
                  : (
                    <div style={{
                      background: C.card, border: `1px solid ${C.border}`,
                      borderRadius: 10, padding: 24, textAlign: "center",
                    }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 800, color: C.green, marginBottom: 6 }}>
                        SQUAD LOOKS SOLID
                      </div>
                      <div style={{ fontSize: 12, color: C.muted }}>No urgent transfers detected. All starters have fixtures this gameweek.</div>
                    </div>
                  )
                }
                <div style={{
                  background: C.surface, borderRadius: 8, padding: "10px 14px",
                  fontSize: 11, color: C.muted, lineHeight: 1.6, marginTop: 4,
                }}>
                  💡 Always check the official FPL site for the latest injury news before the deadline.
                </div>
              </div>
            )}

            {/* ── Planner Tab ── */}
            {tab === "planner" && (
              <TransferPlannerTab transfers={data.transfers} gw={data.gw} />
            )}

            {/* ── Captain Tab ── */}
            {tab === "captain" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.14em", fontWeight: 700, marginBottom: 12 }}>
                  CAPTAIN RECOMMENDATIONS — GW{data.gw}
                </div>
                {data.captains.length > 0
                  ? data.captains.map((p, i) => <CaptainCard key={p.name} pick={p} isTop={i === 0} i={i} />)
                  : <div style={{ color: C.muted, fontSize: 13 }}>No captain data available.</div>
                }
              </div>
            )}

            {/* ── AI Tab ── */}
            {tab === "ai" && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.14em", fontWeight: 700, marginBottom: 12 }}>
                  CLAUDE AI GAMEWEEK ANALYSIS
                </div>
                <div style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 12, padding: 18, marginBottom: 14,
                }}>
                  <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.65, marginBottom: 16 }}>
                    Get a personalised GW{data.gw} strategy from Claude AI — based on your actual squad, blank players, and fixture difficulties.
                  </p>
                  <button
                    onClick={getAiInsight}
                    disabled={aiLoading}
                    style={{
                      width: "100%",
                      background: aiLoading ? C.border : `linear-gradient(135deg, ${C.accent}, ${C.green})`,
                      color: C.bg, borderRadius: 8, padding: 13,
                      fontSize: 14, fontWeight: 900,
                      fontFamily: "'Barlow Condensed', sans-serif",
                      letterSpacing: "0.1em",
                      transition: "all 0.2s",
                    }}
                  >
                    {aiLoading
                      ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Spinner /> ANALYSING YOUR SQUAD...</span>
                      : "⚡ GET AI GAMEWEEK INSIGHT"}
                  </button>
                </div>

                {aiText && (
                  <div style={{
                    background: `linear-gradient(135deg, ${C.card}, ${C.accentDim})`,
                    border: `1px solid ${C.accent}44`,
                    borderRadius: 12, padding: 18,
                    animation: "fadeUp 0.4s ease",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: C.accent, color: C.bg,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 900,
                      }}>✦</div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: C.accent, letterSpacing: "0.1em" }}>
                        CLAUDE ANALYSIS · GW{data.gw}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: C.text, lineHeight: 1.75 }}>{aiText}</p>
                  </div>
                )}

                {!aiText && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      ["Your squad",    `${starters.length} starters loaded`],
                      ["Blank players", `${blanks.length} flagged`],
                      ["Top captain",   data.captains[0]?.name || "—"],
                      ["Top transfer",  data.transfers[0] ? `${data.transfers[0].outName} → ${data.transfers[0].inName}` : "Squad looks good"],
                    ].map(([t, s]) => (
                      <div key={t} style={{
                        background: C.surface, border: `1px solid ${C.border}`,
                        borderRadius: 8, padding: 12,
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 3 }}>{t}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{s}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
