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

const MOCK_TEAM = {
  managerName: "Alex Johnson",
  teamName: "Galácticos FC",
  overallRank: 142853,
  gameweek: 31,
  bankValue: 1.2,
  teamValue: 99.8,
  players: [
    { id: 1, name: "Flekken", position: "GKP", team: "Brentford", price: 4.5, form: 6.2, predicted: 5, ownership: 8.1, status: "fit", fixture: "vs MCI (H)", fixtureRating: 2 },
    { id: 2, name: "Alexander-Arnold", position: "DEF", team: "Liverpool", price: 7.2, form: 7.8, predicted: 8, ownership: 22.4, status: "fit", fixture: "vs TOT (H)", fixtureRating: 1, captain: false },
    { id: 3, name: "Pedro Porro", position: "DEF", team: "Spurs", price: 5.8, form: 5.1, predicted: 5, ownership: 14.2, status: "fit", fixture: "vs LIV (A)", fixtureRating: 4 },
    { id: 4, name: "Mykolenko", position: "DEF", team: "Everton", price: 4.4, form: 4.2, predicted: 4, ownership: 6.8, status: "fit", fixture: "vs BHA (A)", fixtureRating: 3 },
    { id: 5, name: "Salah", position: "MID", team: "Liverpool", price: 13.2, form: 9.4, predicted: 11, ownership: 72.1, status: "doubt", fixture: "vs TOT (H)", fixtureRating: 1, captain: true },
    { id: 6, name: "Palmer", position: "MID", team: "Chelsea", price: 11.1, form: 8.6, predicted: 9, ownership: 48.3, status: "fit", fixture: "vs WHU (A)", fixtureRating: 2, viceCaptain: true },
    { id: 7, name: "B.Fernandes", position: "MID", team: "Man Utd", price: 8.1, form: 7.2, predicted: 8, ownership: 31.2, status: "fit", fixture: "vs BUR (H)", fixtureRating: 1 },
    { id: 8, name: "Gordon", position: "MID", team: "Newcastle", price: 7.8, form: 8.9, predicted: 9, ownership: 35.6, status: "fit", fixture: "vs SUN (H)", fixtureRating: 1 },
    { id: 9, name: "Haaland", position: "FWD", team: "Man City", price: 14.8, form: 6.1, predicted: 6, ownership: 59.4, status: "fit", fixture: "BLANK", fixtureRating: 5 },
    { id: 10, name: "Wilson", position: "FWD", team: "Fulham", price: 6.2, form: 7.8, predicted: 8, ownership: 18.7, status: "fit", fixture: "vs NFO (H)", fixtureRating: 2 },
    { id: 11, name: "João Pedro", position: "FWD", team: "Brighton", price: 6.1, form: 8.4, predicted: 8, ownership: 22.1, status: "fit", fixture: "vs EVE (H)", fixtureRating: 1 },
    { id: 12, name: "Raya", position: "GKP", team: "Arsenal", price: 5.4, form: 5.0, predicted: 3, ownership: 18.2, status: "fit", fixture: "BLANK", fixtureRating: 5, bench: true },
    { id: 13, name: "Munoz", position: "DEF", team: "Crystal Palace", price: 4.8, form: 5.5, predicted: 3, ownership: 9.4, status: "fit", fixture: "BLANK", fixtureRating: 5, bench: true },
    { id: 14, name: "Andreas", position: "MID", team: "Fulham", price: 5.1, form: 4.8, predicted: 5, ownership: 7.2, status: "fit", fixture: "vs NFO (H)", fixtureRating: 2, bench: true },
    { id: 15, name: "Wissa", position: "FWD", team: "Brentford", price: 6.3, form: 6.2, predicted: 6, ownership: 11.3, status: "fit", fixture: "vs MCI (H)", fixtureRating: 3, bench: true },
  ],
};

const TRANSFER_SUGGESTIONS = [
  { out: "Haaland", outTeam: "MCI", outPrice: 14.8, in: "Watkins", inTeam: "AVL", inPrice: 8.9, saving: 5.9, predictedGain: "+4.2 pts", confidence: 87, reason: "Haaland blanks GW31. Watkins faces Ipswich (A) — 3rd best attack fixture." },
  { out: "Raya", outTeam: "ARS", outPrice: 5.4, in: "Flekken", inTeam: "BRE", inPrice: 4.5, saving: 0.9, predictedGain: "+2.1 pts", confidence: 74, reason: "Arsenal blank. Flekken already in squad — swap activates clean sheet opportunity." },
  { out: "Mykolenko", outTeam: "EVE", outPrice: 4.4, in: "Timber", inTeam: "ARS", inPrice: 5.1, saving: -0.7, predictedGain: "+1.8 pts", confidence: 68, reason: "Timber returns from injury. Arsenal blank hurts but underlying quality is higher." },
];

const CAPTAIN_PICKS = [
  { name: "Salah", team: "Liverpool", fixture: "vs TOT (H)", predicted: 11, confidence: 82, trend: "+", ownership: 72.1, status: "doubt" },
  { name: "Palmer", team: "Chelsea", fixture: "vs WHU (A)", predicted: 9, confidence: 78, trend: "+", ownership: 48.3, status: "fit" },
  { name: "Gordon", team: "Newcastle", fixture: "vs SUN (H)", predicted: 9, confidence: 71, trend: "++", ownership: 35.6, status: "fit" },
];

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

  const handleLoad = () => {
    if (!teamId.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setTeam(MOCK_TEAM);
      setLoaded(true);
      setLoading(false);
    }, 1800);
  };

  const handleGetInsight = async () => {
    setAiLoading(true);
    setAiInsight("");
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You are an elite Fantasy Premier League analyst. Give sharp, confident, punchy gameweek advice. Use football language naturally. Be direct and specific. Keep it to 3-4 sentences max. No fluff.",
          messages: [{
            role: "user",
            content: `Gameweek ${MOCK_TEAM.gameweek} FPL advice: My team includes Salah (doubt, vs Spurs), Haaland (blank), Palmer (vs West Ham), Gordon (vs Sunderland). I have 1 free transfer. Key concern: Haaland blanks. What's the sharpest move?`
          }]
        })
      });
      const data = await response.json();
      const text = data.content?.find(b => b.type === "text")?.text || "Analysis unavailable.";
      setAiInsight(text);
    } catch {
      setAiInsight("AI analysis temporarily unavailable. Check your connection and try again.");
    }
    setAiLoading(false);
  };

  const starters = team?.players.filter(p => !p.bench) || [];
  const bench = team?.players.filter(p => p.bench) || [];

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
            <div style={{ background: COLORS.redDim, border: `1px solid ${COLORS.red}44`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10, animation: "fadeSlideIn 0.5s ease" }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.red }}>BLANK GW31 ALERT</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>Haaland, Raya & Munoz have no fixture. Consider transfers.</div>
              </div>
            </div>

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
                {TRANSFER_SUGGESTIONS.map((t, i) => <TransferCard key={i} transfer={t} index={i} />)}
                <div style={{ background: COLORS.surface, borderRadius: 8, padding: "10px 14px", fontSize: 11, color: COLORS.textMuted, lineHeight: 1.6, marginTop: 8 }}>
                  💡 Suggestions are ranked by predicted point gain. Always check the official FPL site for latest injury news before deadline.
                </div>
              </div>
            )}

            {/* Captain Tab */}
            {activeTab === "captain" && (
              <div style={{ animation: "fadeSlideIn 0.3s ease" }}>
                <div style={{ fontSize: 10, color: COLORS.textMuted, letterSpacing: "0.12em", fontWeight: 700, marginBottom: 12 }}>CAPTAIN RECOMMENDATIONS — GW{team.gameweek}</div>
                {CAPTAIN_PICKS.map((p, i) => <CaptainCard key={p.name} pick={p} index={i} isTop={i === 0} />)}
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
                    {[["Your squad", "11 starters analysed"], ["Blank GW", "3 players flagged"], ["Top transfer", "Haaland → Watkins"], ["Captain pick", "Salah (82% conf.)"]].map(([t, s]) => (
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
