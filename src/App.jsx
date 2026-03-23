import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#080C14",
  surface: "#0D1520",
  card: "#111927",
  border: "#1E2D40",
  accent: "#00E5FF",
  accentDim: "#00E5FF22",
  accentGlow: "#00E5FF44",
  green: "#00FF87",
  greenDim: "#00FF8722",
  amber: "#FFB800",
  amberDim: "#FFB80022",
  red: "#FF4C6A",
  redDim: "#FF4C6A22",
  text: "#E8F0FE",
  textMuted: "#5A7A9A",
  textDim: "#3A5A7A",
};

// ── FPL helpers ──────────────────────────────────────────────────────────────
const POSITIONS = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };
const FDR_LABELS = ["", "great", "good", "average", "tough", "very tough"];

async function fetchFPL(path) {
  const res = await fetch(`/api/fpl?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`FPL API error: ${res.status}`);
  return res.json();
}

function predictPoints(player, fix) {
  const form = parseFloat(player.form) || 0;
  const fdr = fix?.difficulty || 3;
  const fdrMod = [0, 1.4, 1.2, 1.0, 0.7, 0.4][fdr];
  const base = form * fdrMod;
  const pos = POSITIONS[player.element_type];
  const csBonus = (pos === "GKP" || pos === "DEF") ? 1.5 : pos === "MID" ? 0.5 : 0;
  return Math.max(1, Math.round((base + csBonus) * 10) / 10);
}

// ---- Sub-components ----

function Pill({ color, children }) {
  const map = { green: [COLORS.green, COLORS.greenDim], amber: [COLORS.amber, COLORS.amberDim], red: [COLORS.red, COLORS.redDim], accent: [COLORS.accent, COLORS.accentDim] };
  const [fg, bg] = map[color] || map.accent;
  return (
    <span style={{ background: bg, color: fg, border: `1px solid ${fg}33`, borderRadius: 4, fontSize: 10, fontWeight: 700, padding: "2px 7px", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function FixtureDot({ rating }) {
  const colors = ["", COLORS.green, "#8BC34A", COLORS.amber, "#FF7043", COLORS.red];
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: colors[rating] || COLORS.textMuted, marginRight: 5, flexShrink: 0 }} />;
}

function StatBar({ value, max = 10, color = COLORS.accent }) {
  return (
    <div style={{ height: 3, background: COLORS.border, borderRadius: 2, overflow: "hidden", width: "100%" }}>
      <div style={{ height: "100%", width: `${(value / max) * 100}%`, background: color, borderRadius: 2, transition: "width 1s ease" }} />
    </div>
  );
}

function PlayerCard({ player }) {
  const posColor = { GKP: "#FFB800", DEF: "#00C853", MID: "#2979FF", FWD: "#FF4C6A" };
  const isBench = player.bench;
  return (
    <div style={{
      background: isBench ? `${COLORS.surface}88` : COLORS.card,
      border: `1px solid ${player.captain ? COLORS.accent : player.viceCaptain ? COLORS.green : COLORS.border}`,
      borderRadius: 8,
      padding: "10px 12px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      opacity: isBench ? 0.65 : 1,
      position: "relative",
      transition: "all 0.2s",
      boxShadow: player.captain ? `0 0 16px ${COLORS.accentGlow}` : "none",
    }}>
      {player.captain && <div style={{ position: "absolute", top: -8, left: 12, background: COLORS.accent, color: COLORS.bg, fontSize: 9, fontWeight: 900, padding: "1px 6px", borderRadius: 3, letterSpacing: "0.1em" }}>CAPTAIN</div>}
      {player.viceCaptain && <div style={{ position: "absolute", top: -8, left: 12, background: COLORS.green, color: COLORS.bg, fontSize: 9, fontWeight: 900, padding: "1px 6px", borderRadius: 3, letterSpacing: "0.1em" }}>VICE C</div>}
      <div style={{ width: 32, height: 32, borderRadius: 6, background: posColor[player.position] + "22", border: `1px solid ${posColor[player.position]}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: posColor[player.position], letterSpacing: "0.05em", flexShrink: 0 }}>
        {player.position}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.text, letterSpacing: "0.02em" }}>{player.name}</span>
          {player.status === "doubt" && <Pill color="amber">Doubt</Pill>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <FixtureDot rating={player.fixtureRating} />
          <span style={{ fontSize: 10, color: player.fixtureRating === 5 ? COLORS.red : COLORS.textMuted }}>{player.fixture}</span>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 800, color: player.fixtureRating === 5 ? COLORS.red : COLORS.accent, lineHeight: 1 }}>{player.fixtureRating === 5 ? "–" : player.predicted}</div>
        <div style={{ fontSize: 9, color: COLORS.textMuted, marginTop: 1 }}>pred pts</div>
      </div>
    </div>
  );
}

function TransferCard({ transfer, index }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 10, animation: `fadeSlideIn 0.4s ease ${index * 0.1}s both` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: COLORS.red, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 3 }}>SELL</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, fontWeight: 800, color: COLORS.text }}>{transfer.out}</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted }}>{transfer.outTeam} · £{transfer.outPrice}m</div>
        </div>
        <div style={{ fontSize: 20, color: COLORS.textDim }}>→</div>
        <div style={{ flex: 1, textAlign: "right" }}>
          <div style={{ fontSize: 10, color: COLORS.green, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 3 }}>BUY</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, fontWeight: 800, color: COLORS.text }}>{transfer.in}</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted }}>{transfer.inTeam} · £{transfer.inPrice}m</div>
        </div>
      </div>
      <div style={{ background: COLORS.surface, borderRadius: 6, padding: "8px 10px", marginBottom: 8, fontSize: 11, color: COLORS.textMuted, lineHeight: 1.5 }}>{transfer.reason}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Pill color="green">{transfer.predictedGain}</Pill>
          <Pill color={transfer.saving > 0 ? "green" : "amber"}>{transfer.saving > 0 ? `+£${transfer.saving}m bank` : `£${Math.abs(transfer.saving)}m cost`}</Pill>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: COLORS.textMuted }}>Confidence</span>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 800, color: transfer.confidence > 80 ? COLORS.green : COLORS.amber }}>{transfer.confidence}%</span>
        </div>
      </div>
    </div>
  );
}

function CaptainCard({ pick, index, isTop }) {
  return (
    <div style={{
      background: isTop ? `linear-gradient(135deg, ${COLORS.card}, ${COLORS.accentDim})` : COLORS.card,
      border: `1px solid ${isTop ? COLORS.accent : COLORS.border}`,
      borderRadius: 10, padding: "14px 16px", marginBottom: 10,
      boxShadow: isTop ? `0 4px 24px ${COLORS.accentGlow}` : "none",
      animation: `fadeSlideIn 0.4s ease ${index * 0.12}s both`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            {isTop && <Pill color="accent">TOP PICK</Pill>}
            {pick.status === "doubt" && <Pill color="amber">Doubt</Pill>}
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 900, color: COLORS.text, letterSpacing: "0.02em" }}>{pick.name}</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{pick.team} · {pick.fixture}</div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>Owned by {pick.ownership}%</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 36, fontWeight: 900, color: isTop ? COLORS.accent : COLORS.text, lineHeight: 1 }}>{pick.predicted}</div>
          <div style={{ fontSize: 9, color: COLORS.textMuted, letterSpacing: "0.08em" }}>PRED PTS</div>
          <div style={{ marginTop: 6, fontSize: 11, color: pick.confidence > 80 ? COLORS.green : COLORS.amber, fontWeight: 700 }}>{pick.confidence}% conf.</div>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: COLORS.textMuted }}>AI Confidence</span>
          <span style={{ fontSize: 10, color: COLORS.textMuted }}>{pick.confidence}%</span>
        </div>
        <StatBar value={pick.confidence} max={100} color={isTop ? COLORS.accent : COLORS.green} />
      </div>
    </div>
  );
}

// ---- Main App ----

export default function PFPLApp() {
  const [activeTab, setActiveTab] = useState("squad");
  const [teamId, setTeamId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [team, setTeam] = useState(null);
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [totalPredicted, setTotalPredicted] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (team) {
      const pts = team.players.filter(p => !p.bench).reduce((s, p) => s + (p.fixtureRating === 5 ? 0 : p.predicted), 0);
      let count = 0;
      const target = pts;
      const interval = setInterval(() => {
        count += Math.ceil(target / 30);
        if (count >= target) { setTotalPredicted(target); clearInterval(interval); }
        else setTotalPredicted(count);
      }, 30);
      return () => clearInterval(interval);
    }
  }, [team]);

  const handleLoad = async () => {
    const id = teamId.trim();
    if (!id || isNaN(id)) { setError("Please enter a valid numeric Team ID."); return; }
    setError(""); setLoading(true);
    try {
      const bootstrap = await fetchFPL("/bootstrap-static/");
      const current = bootstrap.events.find(e => e.is_current) || bootstrap.events.find(e => e.is_next);
      const gw = current?.id || 1;
      const [picks, history] = await Promise.all([
        fetchFPL(`/entry/${id}/event/${gw}/picks/`),
        fetchFPL(`/entry/${id}/`),
      ]);
      const bank = picks.entry_history.bank / 10;
      const teamMap = {}, playerMap = {};
      bootstrap.teams.forEach(t => { teamMap[t.id] = t.short_name; });
      bootstrap.elements.forEach(p => { playerMap[p.id] = p; });
      const fixturesRaw = await fetchFPL(`/fixtures/?event=${gw}`);
      const fixturesByTeam = {};
      fixturesRaw.forEach(f => {
        if (!fixturesByTeam[f.team_h]) fixturesByTeam[f.team_h] = [];
        if (!fixturesByTeam[f.team_a]) fixturesByTeam[f.team_a] = [];
        fixturesByTeam[f.team_h].push({ opponent: teamMap[f.team_a], home: true,  difficulty: f.team_h_difficulty });
        fixturesByTeam[f.team_a].push({ opponent: teamMap[f.team_h], home: false, difficulty: f.team_a_difficulty });
      });
      const posOrder = { GKP: 0, DEF: 1, MID: 2, FWD: 3 };
      const players = picks.picks.map(pick => {
        const p = playerMap[pick.element];
        const fix = fixturesByTeam[p.team]?.[0];
        const pred = fix ? predictPoints(p, fix) : 0;
        return {
          id: p.id, name: p.web_name,
          position: POSITIONS[p.element_type], team: teamMap[p.team],
          price: p.now_cost / 10, form: parseFloat(p.form) || 0,
          predicted: pred, ownership: parseFloat(p.selected_by_percent),
          status: p.chance_of_playing_next_round !== null && p.chance_of_playing_next_round < 100 ? "doubt" : "fit",
          fixture: fix ? `vs ${fix.opponent} (${fix.home ? "H" : "A"})` : "BLANK",
          fixtureRating: fix?.difficulty || 5,
          captain: pick.is_captain, viceCaptain: pick.is_vice_captain,
          bench: pick.position > 11,
        };
      }).sort((a, b) => {
        if (a.bench !== b.bench) return a.bench ? 1 : -1;
        return posOrder[a.position] - posOrder[b.position];
      });
      // Transfer suggestions
      const startersForTransfers = players.filter(p => !p.bench);
      const posToElement = { GKP: 1, DEF: 2, MID: 3, FWD: 4 };
      const allFPLPlayers = bootstrap.elements
        .filter(p => p.status === "a")
        .map(p => ({ ...p, teamShort: teamMap[p.team], fix: fixturesByTeam[p.team]?.[0], pred: fixturesByTeam[p.team]?.[0] ? predictPoints(p, fixturesByTeam[p.team][0]) : 0 }))
        .sort((a, b) => b.pred - a.pred);
      const usedIds = new Set(players.map(p => p.id));
      const transfers = [];
      [...startersForTransfers]
        .sort((a, b) => {
          const aU = a.fixtureRating === 5 || a.status === "doubt";
          const bU = b.fixtureRating === 5 || b.status === "doubt";
          if (aU !== bU) return aU ? -1 : 1;
          return (a.predicted || 0) - (b.predicted || 0);
        })
        .slice(0, 3)
        .forEach(out => {
          const pos = posToElement[out.position];
          const budget = out.price + bank;
          const c = allFPLPlayers.find(p => p.element_type === pos && p.now_cost / 10 <= budget + 0.1 && !usedIds.has(p.id));
          if (c) {
            usedIds.add(c.id);
            const saving = +(budget - c.now_cost / 10 - bank).toFixed(1);
            const isDoubt = out.status === "doubt";
            transfers.push({
              out: out.name, outTeam: out.team, outPrice: out.price,
              in: c.web_name, inTeam: c.teamShort, inPrice: c.now_cost / 10,
              saving: +(-saving).toFixed(1),
              predictedGain: `+${(c.pred - (out.predicted || 0)).toFixed(1)} pts`,
              reason: out.fixtureRating === 5
                ? `${out.name} has no fixture in GW${gw}. ${c.web_name} has a ${FDR_LABELS[c.fix?.difficulty || 3]} fixture vs ${c.fix?.opponent || "unknown"}.`
                : isDoubt
                  ? `${out.name} is a fitness doubt. ${c.web_name} is available and in strong form (${c.form}).`
                  : `${out.name} is underperforming (form ${out.form}). ${c.web_name} offers better value with form ${c.form}.`,
              confidence: out.fixtureRating === 5 ? 85 : isDoubt ? 72 : 58,
            });
          }
        });
      // Captain picks
      const captains = startersForTransfers
        .filter(p => p.fixtureRating !== 5)
        .sort((a, b) => b.predicted - a.predicted)
        .slice(0, 3)
        .map((p, i) => ({ name: p.name, team: p.team, fixture: p.fixture, predicted: p.predicted, confidence: [82, 74, 65][i], ownership: p.ownership, status: p.status }));
      setTeam({
        managerName: `${history.player_first_name} ${history.player_last_name}`,
        teamName: history.name, overallRank: history.summary_overall_rank,
        gameweek: gw, bankValue: bank,
        players, transfers, captains,
      });
      setLoaded(true);
    } catch (e) {
      console.error(e);
      setError("Couldn't load your team. Check your Team ID and try again.");
    }
    setLoading(false);
  };

  const handleGetInsight = async () => {
    if (!team) return;
    setAiLoading(true); setAiInsight("");
    try {
      const blankNames = team.players.filter(p => !p.bench && p.fixtureRating === 5).map(p => p.name);
      const doubtNames = team.players.filter(p => !p.bench && p.status === "doubt").map(p => p.name);
      const captain = team.players.find(p => p.captain)?.name;
      const topPlayers = team.players
        .filter(p => !p.bench && p.fixtureRating !== 5)
        .sort((a, b) => b.predicted - a.predicted)
        .slice(0, 5)
        .map(p => `${p.name} (${p.fixture}, pred ${p.predicted}pts)`);
      const response = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gw: team.gameweek, teamName: team.teamName,
          captain, blanks: blankNames, doubts: doubtNames,
          topPlayers, bank: team.bankValue,
          topTransfer: team.transfers[0] ? `${team.transfers[0].out} → ${team.transfers[0].in}` : null,
        }),
      });
      const data = await response.json();
      setAiInsight(data.text || "Analysis unavailable.");
    } catch {
      setAiInsight("AI analysis temporarily unavailable. Check your connection and try again.");
    }
    setAiLoading(false);
  };

  const starters = team?.players.filter(p => !p.bench) || [];
  const bench = team?.players.filter(p => p.bench) || [];
  const blanks = starters.filter(p => p.fixtureRating === 5);

  const tabs = [
    { id: "squad", label: "Squad" },
    { id: "transfers", label: "Transfers" },
    { id: "captain", label: "Captain" },
    { id: "ai", label: "AI Insight" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'DM Sans', sans-serif", color: COLORS.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes glowPulse { 0%,100% { box-shadow: 0 0 20px ${COLORS.accentGlow}; } 50% { box-shadow: 0 0 40px ${COLORS.accent}55; } }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: ${COLORS.bg}; } ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 2px; }
        input { outline: none; }
        button { cursor: pointer; border: none; outline: none; }
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(180deg, ${COLORS.surface} 0%, ${COLORS.bg} 100%)`, borderBottom: `1px solid ${COLORS.border}`, padding: "16px 20px", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(10px)" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 900, color: COLORS.text, letterSpacing: "-0.02em" }}>p</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 900, color: COLORS.accent, letterSpacing: "-0.02em" }}>FPL</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 900, color: COLORS.accent, letterSpacing: "-0.02em" }}>!</span>
            <span style={{ fontSize: 9, color: COLORS.textMuted, marginLeft: 6, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 500 }}>GW{loaded ? team?.gameweek : "–"}</span>
          </div>
          {loaded && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text }}>{team.teamName}</div>
              <div style={{ fontSize: 10, color: COLORS.textMuted }}>Rank #{team.overallRank.toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px 80px" }}>

        {/* Load Team */}
        {!loaded && (
          <div style={{ padding: "40px 0", animation: "fadeSlideIn 0.5s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 42, fontWeight: 900, lineHeight: 1, marginBottom: 8 }}>
                <span style={{ color: COLORS.text }}>OUTSMART</span><br />
                <span style={{ color: COLORS.accent }}>YOUR GAMEWEEK</span>
              </div>
              <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>AI-powered predictions, transfers & captain picks — built on the FPL API.</p>
            </div>

            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: COLORS.textMuted, letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 }}>YOUR FPL TEAM ID</div>
              <input
                ref={inputRef}
                value={teamId}
                onChange={e => setTeamId(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLoad()}
                placeholder="e.g. 1234567"
                style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "12px 14px", fontSize: 16, color: COLORS.text, fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}
              />
              <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 16 }}>Find your ID in your FPL profile URL: fantasy.premierleague.com/entry/<strong style={{ color: COLORS.textMuted }}>XXXXXXX</strong>/event</div>
              {error && <div style={{ background: COLORS.redDim, border: `1px solid ${COLORS.red}44`, borderRadius: 6, padding: "8px 12px", fontSize: 11, color: COLORS.red, marginBottom: 12 }}>{error}</div>}
              <button
                onClick={handleLoad}
                disabled={loading}
                style={{ width: "100%", background: loading ? COLORS.border : COLORS.accent, color: loading ? COLORS.textMuted : COLORS.bg, borderRadius: 8, padding: "13px", fontSize: 14, fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.08em", transition: "all 0.2s", animation: !loading ? "glowPulse 2s ease infinite" : "none" }}
              >
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span style={{ width: 14, height: 14, border: `2px solid ${COLORS.textMuted}`, borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                    LOADING YOUR SQUAD...
                  </span>
                ) : "LOAD MY TEAM →"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[["🎯", "Point Predictions", "Per player, per gameweek"], ["🔄", "Transfer Picks", "AI-ranked suggestions"], ["👑", "Captain Advice", "Confidence-rated picks"], ["⚡", "AI Insight", "Claude-powered analysis"]].map(([icon, title, sub]) => (
                <div key={title} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, marginBottom: 2 }}>{title}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loaded State */}
        {loaded && (
          <>
            {/* Stats Bar */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "16px 0", animation: "fadeSlideIn 0.4s ease" }}>
              {[
                ["PRED PTS", <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 900, color: COLORS.accent }}>{totalPredicted}</span>],
                ["BANK", <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 900, color: COLORS.green }}>£{team.bankValue}m</span>],
                ["FREE XFER", <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 900, color: COLORS.text }}>1</span>],
              ].map(([label, val]) => (
                <div key={label} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                  {val}
                  <div style={{ fontSize: 9, color: COLORS.textMuted, letterSpacing: "0.1em", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Blank GW Warning */}
            {blanks.length > 0 && (
              <div style={{ background: COLORS.redDim, border: `1px solid ${COLORS.red}44`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10, animation: "fadeSlideIn 0.5s ease" }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.red }}>BLANK GW{team.gameweek} ALERT</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{blanks.map(p => p.name).join(", ")} {blanks.length === 1 ? "has" : "have"} no fixture. Consider transfers.</div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", background: COLORS.surface, borderRadius: 10, padding: 4, marginBottom: 16, gap: 2 }}>
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: "8px 4px", borderRadius: 7, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", background: activeTab === tab.id ? COLORS.accent : "transparent", color: activeTab === tab.id ? COLORS.bg : COLORS.textMuted, transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif" }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Squad Tab */}
            {activeTab === "squad" && (
              <div style={{ animation: "fadeSlideIn 0.3s ease" }}>
                <div style={{ fontSize: 10, color: COLORS.textMuted, letterSpacing: "0.12em", fontWeight: 700, marginBottom: 10 }}>STARTING XI</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                  {starters.map(p => <PlayerCard key={p.id} player={p} />)}
                </div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, letterSpacing: "0.12em", fontWeight: 700, marginBottom: 10 }}>BENCH</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {bench.map(p => <PlayerCard key={p.id} player={p} />)}
                </div>
              </div>
            )}

            {/* Transfers Tab */}
            {activeTab === "transfers" && (
              <div style={{ animation: "fadeSlideIn 0.3s ease" }}>
                <div style={{ fontSize: 10, color: COLORS.textMuted, letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12 }}>AI TRANSFER SUGGESTIONS — GW{team.gameweek}</div>
                {(team.transfers || []).length > 0
                  ? team.transfers.map((t, i) => <TransferCard key={i} transfer={t} index={i} />)
                  : <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 24, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>No urgent transfers detected. Squad looks solid this GW.</div>
                }
                <div style={{ background: COLORS.surface, borderRadius: 8, padding: "10px 14px", fontSize: 11, color: COLORS.textMuted, lineHeight: 1.6, marginTop: 8 }}>
                  💡 Suggestions are ranked by predicted point gain. Always check the official FPL site for latest injury news before deadline.
                </div>
              </div>
            )}

            {/* Captain Tab */}
            {activeTab === "captain" && (
              <div style={{ animation: "fadeSlideIn 0.3s ease" }}>
                <div style={{ fontSize: 10, color: COLORS.textMuted, letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12 }}>CAPTAIN RECOMMENDATIONS — GW{team.gameweek}</div>
                {(team.captains || []).map((p, i) => <CaptainCard key={p.name} pick={p} index={i} isTop={i === 0} />)}
              </div>
            )}

            {/* AI Tab */}
            {activeTab === "ai" && (
              <div style={{ animation: "fadeSlideIn 0.3s ease" }}>
                <div style={{ fontSize: 10, color: COLORS.textMuted, letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12 }}>CLAUDE AI GAMEWEEK ANALYSIS</div>
                <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18, marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6, marginBottom: 14 }}>
                    Get a personalised gameweek strategy from Claude AI, based on your squad, upcoming fixtures, and blank gameweek concerns.
                  </div>
                  <button
                    onClick={handleGetInsight}
                    disabled={aiLoading}
                    style={{ width: "100%", background: aiLoading ? COLORS.border : `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.green})`, color: COLORS.bg, borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.08em", transition: "all 0.2s" }}
                  >
                    {aiLoading ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <span style={{ width: 14, height: 14, border: `2px solid ${COLORS.textMuted}`, borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                        ANALYSING YOUR SQUAD...
                      </span>
                    ) : "⚡ GET AI GAMEWEEK INSIGHT"}
                  </button>
                </div>

                {aiInsight && (
                  <div style={{ background: `linear-gradient(135deg, ${COLORS.card}, ${COLORS.accentDim})`, border: `1px solid ${COLORS.accent}44`, borderRadius: 12, padding: 18, animation: "fadeSlideIn 0.4s ease" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: COLORS.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✦</div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent, letterSpacing: "0.08em" }}>CLAUDE ANALYSIS</span>
                    </div>
                    <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{aiInsight}</p>
                  </div>
                )}

                {!aiInsight && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      ["Your squad", `${starters.length} starters analysed`],
                      ["Blanks", blanks.length > 0 ? blanks.map(p => p.name).join(", ") : "None this GW"],
                      ["Top transfer", team.transfers?.[0] ? `${team.transfers[0].out} → ${team.transfers[0].in}` : "Squad looks solid"],
                      ["Captain pick", team.captains?.[0] ? `${team.captains[0].name} (${team.captains[0].confidence}% conf.)` : "—"],
                    ].map(([t, s]) => (
                      <div key={t} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, marginBottom: 3 }}>{t}</div>
                        <div style={{ fontSize: 11, color: COLORS.textMuted }}>{s}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
