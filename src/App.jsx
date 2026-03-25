import { useState, useEffect, useRef } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

// ── Tokens ────────────────────────────────────────────────────────────────────
const C = {
  bg:"#E8E8E4", nav:"#2C2C2A", panel:"#D4D1C7", card:"#C8C5BC",
  surface:"#D4D1C7", border:"#C0BDB4", borderHi:"#B4B2A9",
  accent:"#3D5BD4", accentNav:"#7BAEFF", accentDim:"#DCE4F815",
  accentGlow:"#3D5BD430", green:"#3A8A5A", greenDim:"#D0E8D820",
  amber:"#8A6010", amberDim:"#EEE0B020", red:"#B84A2A", redDim:"#EED8C820",
  purple:"#6030A0", purpleDim:"#EAE0F820", text:"#1A1A1A",
  secondary:"#4A4844", muted:"#6F6E68", dim:"#B4B2A9",
  selected:"#DCE4F8", sellBg:"#EED8C8", buyBg:"#D0E8D8",
  captBg:"#DCE4F8", captBorder:"#A8B8F0", blankBg:"#F5EAD8",
  pitch:"#2D6A3F", pitchLine:"rgba(255,255,255,0.1)",
};

const POS_COLOR = { GKP:"#8A6010", DEF:"#3A8A5A", MID:"#3D5BD4", FWD:"#B84A2A" };
const FDR_COLOR = ["","#3A8A5A","#6A9A30","#8A6010","#903820","#903820"];
const FDR_BG    = ["","#D0E8D8","#E4EED0","#EEE0B0","#EED8C8","#EED8C8"];

// ── FPL API helpers ───────────────────────────────────────────────────────────
const POSITIONS = { 1:"GKP", 2:"DEF", 3:"MID", 4:"FWD" };
const FDR_LABELS = ["","great","good","average","tough","very tough"];

async function fetchFPL(path) {
  const res = await fetch(`/api/fpl?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`FPL API error: ${res.status}`);
  return res.json();
}

function predictPoints(p, fix) {
  const pos = POSITIONS[p.element_type] || p.pos;
  const fdrMod = [0, 1.4, 1.2, 1.0, 0.7, 0.4][fix?.difficulty || 3];

  // Base: blend of recent form and season points-per-game
  const form  = parseFloat(p.form) || 0;
  const ppg   = parseFloat(p.points_per_game) || form;
  const base  = form * 0.6 + ppg * 0.4;

  // xGI per 90 — direct involvement signal
  const xgi90    = parseFloat(p.expected_goal_involvements_per_90) || 0;
  const xgiBonus = xgi90 * 3;

  // ICT index — threat / creativity composite (0-1 normalized, max 1pt)
  const ict      = parseFloat(p.ict_index) || 0;
  const ictBonus = Math.min(ict / 150, 1.0);

  // Clean sheet probability via Poisson on xGC per 90
  const xgc90  = parseFloat(p.expected_goals_conceded_per_90) || 1.2;
  const csProb = Math.exp(-xgc90);
  const csPts  = pos==="GKP"||pos==="DEF" ? csProb*6 : pos==="MID" ? csProb*1 : 0;

  // Set piece bonus (corners taker & penalty taker)
  const corn     = p.corners_and_indirect_freekicks_order;
  const pens     = p.penalties_order;
  const setBonus = (corn===1?0.5:corn===2?0.15:0) + (pens===1?1.0:pens===2?0.3:0);

  // Availability modifier
  const chance   = p.chance_of_playing_next_round;
  const availMod = chance===null ? 1.0 : chance/100;

  const raw = (base + xgiBonus + ictBonus + csPts + setBonus) * fdrMod * availMod;
  return Math.max(1, Math.round(raw * 10) / 10);
}

function buildFixtureMap(fixtures, teamMap) {
  const map = {};
  fixtures.forEach(f => {
    if (!map[f.team_h]) map[f.team_h] = [];
    if (!map[f.team_a]) map[f.team_a] = [];
    map[f.team_h].push({ opponent: teamMap[f.team_a], home: true,  difficulty: f.team_h_difficulty });
    map[f.team_a].push({ opponent: teamMap[f.team_h], home: false, difficulty: f.team_a_difficulty });
  });
  return map;
}

function formatCountdown(deadline) {
  const diff = new Date(deadline) - Date.now();
  if (diff <= 0) return "Deadline passed";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${d}d : ${String(h).padStart(2,"0")}h : ${String(m).padStart(2,"0")}m`;
}

// ── Login Screen ──────────────────────────────────────────────────────────────

// ── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK = {
  gw:31, nextGw:32, teamName:"Galácticos FC", manager:"Navin Dhillon",
  rank:142853, bank:1.3, teamValue:99.8, totalPts:1547,
  countdown:"18d : 06h : 16m",
  players:[
    {id:1, name:"Kelleher",    short:"KEL", pos:"GKP", team:"LIV", price:4.5, form:6.1, pred:6, ts:129, own:14.2, fix:"EVE(H)", fdr:1, bench:false, captain:false, vice:false, status:"fit"},
    {id:2, name:"Senesi",      short:"SEN", pos:"DEF", team:"BOU", price:5.1, form:7.2, pred:7, ts:137, own:9.4,  fix:"ARS(A)", fdr:4, bench:false, captain:false, vice:false, status:"fit"},
    {id:3, name:"Hill",        short:"HIL", pos:"DEF", team:"NFO", price:4.8, form:6.8, pred:6, ts:131, own:7.1,  fix:"ARS(A)", fdr:4, bench:false, captain:false, vice:false, status:"fit"},
    {id:4, name:"Thiaw",       short:"THI", pos:"DEF", team:"NEW", price:5.1, form:8.2, pred:8, ts:174, own:22.1, fix:"CRY(A)", fdr:2, bench:false, captain:false, vice:false, status:"fit"},
    {id:5, name:"B.Fernandes", short:"BFE", pos:"MID", team:"MUN", price:8.1, form:8.6, pred:9, ts:189, own:31.2, fix:"LEE(H)", fdr:1, bench:false, captain:true,  vice:false, status:"fit"},
    {id:6, name:"Wilson",      short:"WIL", pos:"MID", team:"FUL", price:6.2, form:7.8, pred:8, ts:152, own:18.7, fix:"LIV(A)", fdr:4, bench:false, captain:false, vice:false, status:"fit"},
    {id:7, name:"Casemiro",    short:"CAS", pos:"MID", team:"MUN", price:5.7, form:6.4, pred:6, ts:134, own:11.3, fix:"LEE(H)", fdr:1, bench:false, captain:false, vice:false, status:"fit"},
    {id:8, name:"Anderson",    short:"AND", pos:"MID", team:"NFO", price:5.6, form:7.1, pred:7, ts:138, own:8.9,  fix:"AVL(H)", fdr:2, bench:false, captain:false, vice:false, status:"fit"},
    {id:9, name:"Thiago",      short:"THA", pos:"FWD", team:"BRE", price:7.3, form:7.4, pred:7, ts:153, own:12.4, fix:"EVE(H)", fdr:1, bench:false, captain:false, vice:false, status:"fit"},
    {id:10,name:"Ekitiké",     short:"EKI", pos:"FWD", team:"FUL", price:9.3, form:8.8, pred:9, ts:171, own:16.8, fix:"LIV(A)", fdr:3, bench:false, captain:false, vice:true,  status:"fit"},
    {id:11,name:"Onana",       short:"ONA", pos:"FWD", team:"AVL", price:6.1, form:5.9, pred:6, ts:118, own:7.2,  fix:"NFO(A)", fdr:2, bench:false, captain:false, vice:false, status:"doubt"},
    {id:12,name:"Roefs",       short:"ROE", pos:"GKP", team:"TOT", price:4.4, form:4.2, pred:0, ts:88,  own:5.1,  fix:"BLA",    fdr:5, bench:true,  captain:false, vice:false, status:"fit"},
    {id:13,name:"Ballard",     short:"BAL", pos:"DEF", team:"TOT", price:4.6, form:5.1, pred:0, ts:94,  own:6.3,  fix:"BLA",    fdr:5, bench:true,  captain:false, vice:false, status:"fit"},
    {id:14,name:"Haaland",     short:"HAA", pos:"FWD", team:"MCI", price:14.5,form:6.1, pred:0, ts:197, own:59.4, fix:"BLA",    fdr:5, bench:true,  captain:false, vice:false, status:"fit"},
    {id:15,name:"Gabriel",     short:"GAB", pos:"DEF", team:"ARS", price:6.2, form:7.1, pred:0, ts:173, own:28.4, fix:"BLA",    fdr:5, bench:true,  captain:false, vice:false, status:"fit"},
  ],
  allPlayers:[
    {name:"Raya",      pos:"GKP", team:"ARS", price:6.0, ts:129, form:6.2, fix:"BLA",    fdr:5},
    {name:"Flekken",   pos:"GKP", team:"BRE", price:4.5, ts:118, form:6.1, fix:"EVE(H)", fdr:1},
    {name:"Gabriel",   pos:"DEF", team:"ARS", price:7.2, ts:173, form:7.1, fix:"BLA",    fdr:5},
    {name:"J.Timber",  pos:"DEF", team:"ARS", price:6.3, ts:149, form:7.4, fix:"BLA",    fdr:5},
    {name:"Tarkowski", pos:"DEF", team:"EVE", price:5.7, ts:142, form:5.8, fix:"BRE(A)", fdr:3},
    {name:"Senesi",    pos:"DEF", team:"BOU", price:5.1, ts:137, form:7.2, fix:"ARS(A)", fdr:4},
    {name:"Guéhi",     pos:"DEF", team:"MCI", price:5.1, ts:135, form:5.9, fix:"BLA",    fdr:5},
    {name:"Virgil",    pos:"DEF", team:"LIV", price:6.3, ts:135, form:6.8, fix:"FUL(H)", fdr:2},
    {name:"B.Fernandes",pos:"MID",team:"MUN", price:10.2,ts:189, form:8.6, fix:"LEE(H)", fdr:1},
    {name:"Semenyo",   pos:"MID", team:"MCI", price:8.2, ts:174, form:7.9, fix:"BLA",    fdr:5},
    {name:"Rice",      pos:"MID", team:"ARS", price:7.3, ts:163, form:7.1, fix:"BLA",    fdr:5},
    {name:"Wilson",    pos:"MID", team:"FUL", price:6.1, ts:152, form:7.8, fix:"LIV(A)", fdr:4},
    {name:"Garner",    pos:"MID", team:"EVE", price:5.2, ts:139, form:6.4, fix:"BRE(A)", fdr:3},
    {name:"Rogers",    pos:"MID", team:"AVL", price:7.5, ts:138, form:7.2, fix:"NFO(A)", fdr:2},
    {name:"Haaland",   pos:"FWD", team:"MCI", price:14.5,ts:197, form:6.1, fix:"BLA",    fdr:5},
    {name:"João Pedro",pos:"FWD", team:"CHE", price:7.8, ts:164, form:8.4, fix:"SHU(H)", fdr:1},
    {name:"Thiago",    pos:"FWD", team:"BRE", price:7.3, ts:153, form:7.4, fix:"EVE(H)", fdr:1},
    {name:"Bowen",     pos:"FWD", team:"WHU", price:7.5, ts:143, form:6.8, fix:"SUN(H)", fdr:2},
  ],
  fixtures:[
    {time:"10 Apr 20:00", home:"West Ham",     away:"Wolves"},
    {time:"11 Apr 12:30", home:"Arsenal",      away:"Bournemouth"},
    {time:"11 Apr 15:00", home:"Brentford",    away:"Everton"},
    {time:"11 Apr 15:00", home:"Burnley",      away:"Brighton"},
    {time:"11 Apr 17:30", home:"Liverpool",    away:"Fulham"},
    {time:"12 Apr 14:00", home:"Crystal Palace",away:"Newcastle"},
    {time:"12 Apr 14:00", home:"Nott'm Forest",away:"Aston Villa"},
    {time:"12 Apr 14:00", home:"Sunderland",   away:"Spurs"},
    {time:"12 Apr 16:30", home:"Chelsea",      away:"Man City"},
    {time:"13 Apr 20:00", home:"Man Utd",      away:"Leeds"},
  ],
  transferSuggestions:[
    {out:"Haaland", outTeam:"MCI", outPrice:14.5, in:"João Pedro", inTeam:"CHE", inPrice:7.8, gain:"+3.8", conf:88, reason:"Blank cleared. João Pedro faces Sheffield Utd (H) — elite fixture."},
    {out:"Roefs",   outTeam:"TOT", outPrice:4.4,  in:"Flekken",   inTeam:"BRE", inPrice:4.5, gain:"+2.4", conf:76, reason:"Swap blank GKP for active one. Minimal cost."},
    {out:"Ballard", outTeam:"TOT", outPrice:4.6,  in:"Virgil",    inTeam:"LIV", inPrice:6.3, gain:"+2.1", conf:71, reason:"Defensive upgrade. Liverpool face Fulham at home."},
  ],
  captainPicks:[
    {name:"B.Fernandes", team:"MUN", fix:"vs LEE (H)", pred:9,  conf:82, own:31.2, status:"fit"},
    {name:"Ekitiké",     team:"FUL", fix:"vs LIV (A)", pred:9,  conf:71, own:16.8, status:"fit"},
    {name:"Thiaw",       team:"NEW", fix:"vs CRY (A)", pred:8,  conf:65, own:22.1, status:"fit"},
  ],
  chips:[
    {name:"Free Hit",      icon:"⚡", pts:51, rec:"Save the chip — projected score is solid without it."},
    {name:"Bench Boost",   icon:"📈", pts:19, rec:"Recommended to consider. Bench scores 19 projected."},
    {name:"Triple Captain",icon:"👑", pts:5,  rec:"Save chip. Thiaw only projects 5pts (no multiplier boost)."},
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function Pill({color="accent", children, small}){
  const map={accent:[C.accent,C.accentDim], green:[C.green,C.greenDim], amber:[C.amber,C.amberDim], red:[C.red,C.redDim], purple:[C.purple,C.purpleDim]};
  const [fg,bg]=map[color]||map.accent;
  return <span style={{background:bg,color:fg,border:`1px solid ${fg}33`,borderRadius:3,fontSize:small?8:9,fontWeight:800,padding:small?"1px 5px":"2px 7px",letterSpacing:".1em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{children}</span>;
}

function FdrBadge({fix, fdr}){
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,color:fdr===5?C.red:C.muted}}>
    <span style={{width:6,height:6,borderRadius:"50%",background:FDR_COLOR[fdr]||C.muted,display:"inline-block",flexShrink:0}}/>
    {fix}
  </span>;
}

function AvatarCircle({name, pos, size=40}){
  const initials = (name||"??").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const col = POS_COLOR[pos]||"#888";
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:col+"22",border:`2px solid ${col}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size/3.5,fontWeight:800,color:col,flexShrink:0,fontFamily:"'Syne',sans-serif"}}>
      {initials}
    </div>
  );
}

function XGBar({val, max=1.0, color=C.accent, label}){
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
      <div style={{fontSize:9,color:C.muted,width:52,flexShrink:0}}>{label}</div>
      <div style={{flex:1,height:3,background:C.border,borderRadius:2}}>
        <div style={{width:`${Math.min(100,(val/max)*100)}%`,height:"100%",background:color,borderRadius:2}}/>
      </div>
      <div style={{fontSize:9,color:C.text,width:30,textAlign:"right",flexShrink:0}}>{typeof val==="number"?val.toFixed(2):val}</div>
    </div>
  );
}

// ── Pitch Player ──────────────────────────────────────────────────────────────
function PitchPlayer({p, onPlayerClick, isSelected}){
  const [imgErr, setImgErr] = useState(false);
  const [kitErr, setKitErr] = useState(false);
  const blank = p.fdr===5;

  return (
    <div onClick={()=>onPlayerClick(p)} style={{display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",gap:2,minWidth:56,userSelect:"none"}}>
      {/* Avatar area */}
      <div style={{position:"relative",width:46,height:46}}>

        {/* Selection glow */}
        {isSelected&&<div style={{position:"absolute",inset:-4,borderRadius:"50%",background:`radial-gradient(circle,${C.accent}55 0%,transparent 70%)`,zIndex:0}}/>}

        {/* Photo or initials fallback */}
        {p.photo&&!imgErr ? (
          <img
            src={p.photo} alt={p.name}
            onError={()=>setImgErr(true)}
            style={{width:46,height:46,borderRadius:"50%",objectFit:"cover",objectPosition:"top center",
              border:`2.5px solid ${isSelected?C.accent:blank?"#E8705A99":POS_COLOR[p.pos]+"88"}`,
              position:"relative",zIndex:1,background:"#ccc",display:"block"}}
          />
        ):(
          <div style={{width:46,height:46,borderRadius:"50%",
            background:blank?"#E8705A":`linear-gradient(135deg,${POS_COLOR[p.pos]}33,${POS_COLOR[p.pos]}11)`,
            border:`2.5px solid ${isSelected?C.accent:blank?"#E8705A":POS_COLOR[p.pos]+"66"}`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:11,fontWeight:900,color:blank?"#fff":POS_COLOR[p.pos],
            fontFamily:"'Syne',sans-serif",position:"relative",zIndex:1}}>
            {p.short||p.name?.slice(0,3).toUpperCase()}
          </div>
        )}

        {/* Team jersey badge */}
        {p.jersey&&!kitErr&&(
          <img src={p.jersey} alt="" onError={()=>setKitErr(true)}
            style={{position:"absolute",bottom:-4,right:-4,width:22,height:22,
              objectFit:"contain",zIndex:2,filter:"drop-shadow(0 1px 3px #000a)"}}/>
        )}

        {/* Captain / Vice badge */}
        {p.captain&&<div style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:"#3D5BD4",color:"#fff",fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",zIndex:3,boxShadow:`0 0 6px #3D5BD488`}}>C</div>}
        {!p.captain&&p.vice&&<div style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:"#3A8A5A",color:"#fff",fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",zIndex:3}}>V</div>}

        {/* Blank GW label */}
        {blank&&<div style={{position:"absolute",bottom:-5,left:"50%",transform:"translateX(-50%)",background:"#E8705A",borderRadius:10,padding:"1px 4px",fontSize:6,fontWeight:900,color:"#fff",whiteSpace:"nowrap",zIndex:3,letterSpacing:".06em"}}>BLANK</div>}

        {/* Doubt ? badge */}
        {p.status==="doubt"&&<div style={{position:"absolute",top:-4,left:-4,width:14,height:14,borderRadius:"50%",background:C.amber,color:"#fff",fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",zIndex:3}}>?</div>}
      </div>

      {/* Name chip */}
      <div style={{background:isSelected?C.accent:blank?"#E8705A":`${C.nav}dd`,color:"#F0EEE8",
        borderRadius:10,padding:"2px 6px",fontSize:9,fontWeight:700,
        whiteSpace:"nowrap",maxWidth:72,overflow:"hidden",textOverflow:"ellipsis",textAlign:"center"}}>
        {p.short||p.name}
      </div>

      {/* Prediction */}
      <div style={{background:blank?"#E8705A44":`${C.nav}99`,borderRadius:2,padding:"1px 5px",
        fontSize:9,color:blank?"#E8705A":C.accent,fontWeight:800}}>
        {blank?"–":(p.predicted||p.pred||0)}
      </div>

      {/* Fixture */}
      <div style={{display:"flex",alignItems:"center",gap:3}}>
        <span style={{width:5,height:5,borderRadius:"50%",background:FDR_COLOR[p.fdr]||C.muted,display:"inline-block",flexShrink:0}}/>
        <span style={{fontSize:8,color:blank?C.red:C.muted}}>{p.fix}</span>
      </div>
    </div>
  );
}

// ── Pitch ─────────────────────────────────────────────────────────────────────
function Pitch({players, onPlayerClick, selectedId}){
  const starters = players.filter(p=>!p.bench);
  const bench    = players.filter(p=>p.bench);
  const byPos    = pos => starters.filter(p=>p.pos===pos);
  const rows     = [byPos("GKP"), byPos("DEF"), byPos("MID"), byPos("FWD")];

  // Pitch grass colours — muted dark green
  const GA = "#2D6A3F"; // base
  const GB = "#275E38"; // darker stripe

  return (
    <div style={{
      position:"relative", borderRadius:16, overflow:"hidden",
      boxShadow:"0 0 0 2px rgba(255,255,255,0.18), 0 8px 40px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.15)",
    }}>
      {/* ── Grass base with crisp horizontal mowing stripes ── */}
      <div style={{
        position:"absolute", inset:0,
        background:`repeating-linear-gradient(180deg,${GA} 0px,${GA} 36px,${GB} 36px,${GB} 72px)`,
      }}/>

      {/* ── Edge shadow vignette for stadium depth ── */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        background:"radial-gradient(ellipse 90% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.35) 100%)",
      }}/>

      {/* ── SVG pitch markings (accurate proportions, viewBox portrait 68×105) ── */}
      <svg
        style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none"}}
        viewBox="0 0 68 105"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Subtle white glow on lines */}
          <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* — Outer boundary — */}
        <rect x="2" y="2" width="64" height="101" fill="none"
          stroke="rgba(255,255,255,0.22)" strokeWidth="0.7" filter="url(#lineGlow)"/>

        {/* — Halfway line — */}
        <line x1="2" y1="52.5" x2="66" y2="52.5"
          stroke="rgba(255,255,255,0.22)" strokeWidth="0.7"/>

        {/* — Centre circle (r=9.15m → ~5.94 in viewBox units) — */}
        <circle cx="34" cy="52.5" r="5.95"
          fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.7"/>
        {/* Centre spot */}
        <circle cx="34" cy="52.5" r="0.55" fill="rgba(255,255,255,0.3)"/>

        {/* ══ TOP END (attacking) ══ */}
        {/* Penalty box 40.32m wide × 16.5m deep → 37.05×10.72 */}
        <rect x="15.47" y="2" width="37.05" height="10.72"
          fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.22)" strokeWidth="0.7"/>
        {/* 6-yard box 18.32×5.5m → 16.84×3.57 */}
        <rect x="24.58" y="2" width="18.84" height="3.57"
          fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.55"/>
        {/* Goal 7.32×2.44m → 6.73×1.59 */}
        <rect x="30.63" y="0.5" width="6.73" height="2"
          fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6"/>
        {/* Penalty spot at 11m → 7.15 */}
        <circle cx="34" cy="9.15" r="0.5" fill="rgba(255,255,255,0.3)"/>
        {/* Penalty arc (only portion outside box) */}
        <path d="M 24.5 12.72 A 9.16 9.16 0 0 1 43.5 12.72"
          fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.7"/>

        {/* ══ BOTTOM END (defending) ══ */}
        <rect x="15.47" y="92.28" width="37.05" height="10.72"
          fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.22)" strokeWidth="0.7"/>
        <rect x="24.58" y="99.43" width="18.84" height="3.57"
          fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.55"/>
        <rect x="30.63" y="101.5" width="6.73" height="2"
          fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6"/>
        <circle cx="34" cy="95.85" r="0.5" fill="rgba(255,255,255,0.3)"/>
        <path d="M 24.5 92.28 A 9.16 9.16 0 0 0 43.5 92.28"
          fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.7"/>

        {/* ══ Corner arcs ══ */}
        <path d="M 2 4.5 A 2.5 2.5 0 0 0 4.5 2"   fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.55"/>
        <path d="M 63.5 2 A 2.5 2.5 0 0 0 66 4.5"  fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.55"/>
        <path d="M 2 100.5 A 2.5 2.5 0 0 1 4.5 103" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.55"/>
        <path d="M 63.5 103 A 2.5 2.5 0 0 1 66 100.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.55"/>

        {/* ══ Goal nets (grid pattern) ══ */}
        {/* Top goal net */}
        <line x1="30.63" y1="0.5" x2="30.63" y2="2.5" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3"/>
        <line x1="33.36" y1="0.5" x2="33.36" y2="2.5" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3"/>
        <line x1="36.1"  y1="0.5" x2="36.1"  y2="2.5" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3"/>
        <line x1="30.63" y1="1.5" x2="37.36" y2="1.5" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3"/>
        {/* Bottom goal net */}
        <line x1="30.63" y1="101.5" x2="30.63" y2="103.5" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3"/>
        <line x1="33.36" y1="101.5" x2="33.36" y2="103.5" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3"/>
        <line x1="36.1"  y1="101.5" x2="36.1"  y2="103.5" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3"/>
        <line x1="30.63" y1="102.5" x2="37.36" y2="102.5" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3"/>
      </svg>

      {/* ── Player rows (above all decorative layers) ── */}
      <div style={{position:"relative",zIndex:1,padding:"16px 8px 12px"}}>
        {rows.map((row,ri)=>(
          <div key={ri} style={{display:"flex",justifyContent:"center",gap:8,marginBottom:ri<3?20:0}}>
            {row.map(p=><PitchPlayer key={p.id} p={p} onPlayerClick={onPlayerClick} isSelected={selectedId===p.id}/>)}
          </div>
        ))}

        {/* Bench */}
        <div style={{
          borderTop:`1px dashed ${C.border}`,
          marginTop:16,paddingTop:12,
          display:"flex",justifyContent:"center",gap:8,alignItems:"center",
          background:"rgba(0,0,0,0.06)",
          marginLeft:-8,marginRight:-8,paddingLeft:8,paddingRight:8,paddingBottom:4,
          opacity:0.7,
        }}>
          <div style={{flex:1,height:1,background:C.border,maxWidth:24}}/>
          <div style={{fontSize:8,color:C.muted,letterSpacing:".16em",fontWeight:700,textTransform:"uppercase"}}>BENCH</div>
          <div style={{flex:1,height:1,background:C.border,maxWidth:24}}/>
          {bench.map(p=><PitchPlayer key={p.id} p={p} onPlayerClick={onPlayerClick} isSelected={selectedId===p.id}/>)}
        </div>
      </div>
    </div>
  );
}

// ── Multi-GW Analyser ─────────────────────────────────────────────────────────
async function fetchMultiGwFixtures(bootstrap, fromGw, toGw) {
  const teamMap = {};
  bootstrap.teams.forEach(t => { teamMap[t.id] = t.short_name; });
  const gwNums = [];
  for (let g = fromGw; g <= toGw; g++) gwNums.push(g);
  const fixtureSets = await Promise.all(gwNums.map(g => fetchFPL(`/fixtures/?event=${g}`)));
  const result = {};
  gwNums.forEach((g, i) => { result[g] = buildFixtureMap(fixtureSets[i], teamMap); });
  return result;
}

function SectionBlock({ title, subtitle, children }) {
  return (
    <div style={{ marginBottom:24, background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
      <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800, color:C.text }}>{title}</div>
        {subtitle && <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{subtitle}</div>}
      </div>
      <div style={{ padding:18 }}>{children}</div>
    </div>
  );
}

function ChipCard({ icon, name, rec, detail, color }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
        <div style={{ fontSize:24 }}>{icon}</div>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:700, color:C.text }}>{name}</div>
          <div style={{ fontSize:11, fontWeight:700, color }}>{rec}</div>
        </div>
      </div>
      <div style={{ fontSize:11, color:C.muted, lineHeight:1.6 }}>{detail}</div>
    </div>
  );
}

function MGWFdrBadge({ fdr, blank, label }) {
  const s = { 1:{bg:"#D0E8D8",text:"#3A8A5A"}, 2:{bg:"#E4EED0",text:"#6A9A30"}, 3:{bg:"#EEE0B0",text:"#8A6010"}, 4:{bg:"#EED8C8",text:"#903820"}, 5:{bg:"#EED8C8",text:"#903820"} };
  const st = blank ? {bg:"#EED8C8",text:"#903820"} : (s[fdr]||s[3]);
  return (
    <div style={{ fontSize:8, padding:"2px 5px", borderRadius:3, background:st.bg, color:st.text, fontWeight:700, flexShrink:0, whiteSpace:"nowrap" }}>
      {blank ? "BLK" : (label || `FDR${fdr}`)}
    </div>
  );
}

function MGWPlayerTable({ players, gwNums, squadIds, posAvg, showKeepBadge }) {
  const cols = `28px minmax(140px,1fr) 46px 40px 46px 64px 56px ${gwNums.map(()=>"36px").join(" ")} 46px`;
  return (
    <div style={{ overflowX:"auto" }}>
      <div style={{ display:"grid", gridTemplateColumns:cols, gap:4, padding:"7px 10px", borderBottom:`1px solid ${C.border}`, fontSize:9, fontWeight:700, color:C.muted, letterSpacing:".08em", minWidth:500 }}>
        {["#","Player","Team","Pos","£m","Proj","Avg/GW",...gwNums.map(g=>`GW${g}`),"Own%"].map((h,i)=>
          <div key={i}>{h}</div>
        )}
      </div>
      {players.map((p, i) => {
        const isInSquad = squadIds?.has(p.id);
        const keep = posAvg ? p.multiGwScore >= posAvg[p.pos] : null;
        return (
          <div key={p.id??i} style={{ display:"grid", gridTemplateColumns:cols, gap:4, padding:"7px 10px", borderBottom:`1px solid ${C.border}22`, background:i%2===0?"transparent":`${C.surface}55`, alignItems:"center", minWidth:500 }}>
            <div style={{ fontSize:10, color:C.muted, fontWeight:600 }}>{i+1}</div>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:4, flexWrap:"wrap" }}>
                <span style={{ fontSize:12, fontWeight:600, color:C.text }}>{p.name}</span>
                {isInSquad && <span style={{ fontSize:8, background:`${C.accent}22`, border:`1px solid ${C.accent}44`, color:C.accent, borderRadius:3, padding:"1px 4px", fontWeight:700 }}>IN SQUAD</span>}
                {showKeepBadge && keep===true  && <span style={{ fontSize:8, background:C.greenDim, border:`1px solid ${C.green}44`, color:C.green, borderRadius:3, padding:"1px 4px", fontWeight:700 }}>KEEP</span>}
                {showKeepBadge && keep===false && <span style={{ fontSize:8, background:C.amberDim, border:`1px solid ${C.amber}44`, color:C.amber, borderRadius:3, padding:"1px 4px", fontWeight:700 }}>CONSIDER SELLING</span>}
              </div>
            </div>
            <div style={{ fontSize:10, color:C.muted }}>{p.team}</div>
            <div><span style={{ fontSize:9, padding:"1px 5px", borderRadius:3, background:POS_COLOR[p.pos]+"22", color:POS_COLOR[p.pos], fontWeight:700 }}>{p.pos}</span></div>
            <div style={{ fontSize:11, color:C.secondary }}>£{p.price?.toFixed(1)}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800, color:C.accent }}>{p.multiGwScore}</div>
            <div style={{ fontSize:11, color:C.secondary }}>{p.avgPerGw}/gw</div>
            {gwNums.map(gw => {
              const fix = p.fixtureRun?.find(f=>f.gw===gw);
              return <MGWFdrBadge key={gw} fdr={fix?.fdr||5} blank={!fix||fix.blank} />;
            })}
            <div style={{ fontSize:10, color:C.muted }}>{p.own?.toFixed(1)}%</div>
          </div>
        );
      })}
    </div>
  );
}

function MultiGwAnalyser({ players, allPlayers, bank, currentGw, bootstrapRef }) {
  const [fromGw, setFromGw] = useState(currentGw);
  const [toGw,   setToGw]   = useState(Math.min(currentGw + 5, 38));
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const squadIds = new Set((players||[]).map(p=>p.id));
  const starters = (players||[]).filter(p=>!p.bench);

  const analyse = async () => {
    const bootstrap = bootstrapRef.current;
    if (!bootstrap) return;
    setAnalysing(true); setResult(null);
    try {
      const gwFixtures = await fetchMultiGwFixtures(bootstrap, fromGw, toGw);
      const gwNums = Object.keys(gwFixtures).map(Number).sort((a,b)=>a-b);
      const teamNameMap = {};
      bootstrap.teams.forEach(t => { teamNameMap[t.id] = t.short_name; });

      // Score every active player across the GW range
      const processed = bootstrap.elements
        .filter(p => p.status==="a" || p.status==="d")
        .map(p => {
          let total = 0;
          const fixtureRun = gwNums.map(gw => {
            const fix = gwFixtures[gw][p.team]?.[0];
            if (!fix) return { gw, blank:true, fdr:5, score:0 };
            const score = predictPoints(p, fix);
            total += score;
            return { gw, blank:false, fdr:fix.difficulty, opponent:fix.opponent, home:fix.home, score };
          });
          return {
            id: p.id, name: p.web_name,
            pos: POSITIONS[p.element_type],
            team: teamNameMap[p.team]||"?",
            price: p.now_cost/10,
            own: parseFloat(p.selected_by_percent)||0,
            form: parseFloat(p.form)||0,
            ppg: parseFloat(p.points_per_game)||0,
            multiGwScore: Math.round(total*10)/10,
            avgPerGw: Math.round((total/gwNums.length)*10)/10,
            fixtureRun,
          };
        })
        .sort((a,b)=>b.multiGwScore-a.multiGwScore);

      const top20 = processed.slice(0,20);

      // My starters matched from processed list
      const mySquadAnalysis = starters
        .map(sp => processed.find(pp=>pp.id===sp.id))
        .filter(Boolean)
        .sort((a,b)=>b.multiGwScore-a.multiGwScore);

      // Per-position average (top 20 at each pos)
      const posAvg = {};
      ["GKP","DEF","MID","FWD"].forEach(pos => {
        const pp = processed.filter(p=>p.pos===pos).slice(0,20);
        posAvg[pos] = pp.length ? pp.reduce((s,p)=>s+p.multiGwScore,0)/pp.length : 0;
      });

      // Transfer targets
      const usedInPlan = new Set(starters.map(p=>p.id));
      const considerSelling = mySquadAnalysis.filter(p=>p.multiGwScore < posAvg[p.pos]);
      const transferTargets = [];
      considerSelling.forEach(outPlayer => {
        const budget = outPlayer.price + bank;
        const targets = processed
          .filter(p=>p.pos===outPlayer.pos && p.price<=budget+0.1 && !usedInPlan.has(p.id))
          .slice(0,3)
          .map(p=>({...p, gain:Math.round((p.multiGwScore-outPlayer.multiGwScore)*10)/10}));
        if (targets.length) { transferTargets.push({out:outPlayer, targets}); targets.forEach(t=>usedInPlan.add(t.id)); }
      });

      // Chip strategy
      const topForChip = processed.slice(0,5);
      const gwAvgScores = gwNums.map(gw=>({
        gw, avg: topForChip.reduce((s,p)=>s+(p.fixtureRun.find(f=>f.gw===gw)?.score||0),0)/topForChip.length,
      })).sort((a,b)=>b.avg-a.avg);

      const bench = (players||[]).filter(p=>p.bench);
      const benchProc = bench.map(sp=>processed.find(p=>p.id===sp.id)).filter(Boolean);
      const gwBenchScores = gwNums.map(gw=>({
        gw, score: benchProc.reduce((s,p)=>s+(p.fixtureRun.find(f=>f.gw===gw)?.score||0),0),
      })).sort((a,b)=>b.score-a.score);

      const blankGws = gwNums.filter(gw => Object.keys(gwFixtures[gw]).length < 28);

      setResult({ top20, mySquadAnalysis, considerSelling, transferTargets, posAvg, gwNums,
        chipStrategy:{ bestTcGw:gwAvgScores[0], bestBbGw:gwBenchScores[0], blankGws } });
    } catch(e) { console.error("MultiGW:", e); }
    setAnalysing(false);
  };

  const getAiSummary = async () => {
    if (!result) return;
    setAiLoading(true); setAiSummary(null);
    const top5 = result.top20.slice(0,5).map(p=>`${p.name}(${p.team},${p.pos})=${p.multiGwScore}pts`).join(", ");
    const squad = result.mySquadAnalysis.slice(0,5).map(p=>`${p.name}=${p.multiGwScore}pts`).join(", ");
    const tx = result.transferTargets.slice(0,3).map(t=>`Sell ${t.out.name}→${t.targets[0]?.name}(+${t.targets[0]?.gain})`).join("; ");
    const {bestTcGw,bestBbGw,blankGws}=result.chipStrategy;
    const chips=`TC GW${bestTcGw?.gw}, BB GW${bestBbGw?.gw}${blankGws.length?`, Blanks:GW${blankGws.join(",GW")}`:""}`;
    try {
      const res = await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({gw:`${fromGw}–${toGw}`,teamName:"your squad",captain:result.top20[0]?.name,
          blanks:blankGws.map(g=>`GW${g}`),doubts:[],
          topPlayers:[`Top picks: ${top5}`,`Your squad: ${squad}`,`Transfers: ${tx}`,chips],
          bank,topTransfer:result.transferTargets[0]?.targets[0]?.name})});
      const d = await res.json();
      setAiSummary(d.text||"Analysis unavailable.");
    } catch(e) { setAiSummary("Failed to get AI analysis."); }
    setAiLoading(false);
  };

  return (
    <div style={{ overflow:"auto", padding:24, height:"100%", minHeight:0 }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:900, color:C.text, marginBottom:4 }}>GW Planner</div>
        <div style={{ fontSize:11, color:C.muted }}>Analyse fixture runs, identify transfer targets and plan chip strategy across multiple gameweeks.</div>
      </div>

      {/* Range selector */}
      <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 18px", marginBottom:20, display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
        {[["FROM GW",fromGw,v=>{const n=Math.max(1,Math.min(38,v));setFromGw(n);if(toGw<n)setToGw(Math.min(n+5,38));if(toGw-n>9)setToGw(n+9);}],
          ["TO GW",  toGw,  v=>{const n=Math.max(1,Math.min(38,v));setToGw(n);if(n<fromGw)setFromGw(Math.max(1,n-5));if(n-fromGw>9)setFromGw(n-9);}]]
          .map(([label,val,setter])=>(
            <div key={label} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:".08em" }}>{label}</div>
              <input type="number" value={val} min={1} max={38}
                onChange={e=>setter(parseInt(e.target.value)||currentGw)}
                style={{ width:60, background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, padding:"7px 10px", fontSize:15, color:C.text, textAlign:"center", fontFamily:"'Syne',sans-serif", fontWeight:700 }}
              />
            </div>
          ))}
        <div style={{ fontSize:10, color:C.muted }}>Range: <strong style={{color:C.secondary}}>{toGw-fromGw+1}</strong> GW{toGw-fromGw!==0?"s":""} · max 10</div>
        <button onClick={analyse} disabled={analysing}
          style={{ background:analysing?C.border:C.accent, color:"#F0EEE8", border:"none", borderRadius:8, padding:"10px 24px", fontSize:13, fontWeight:800, fontFamily:"'Syne',sans-serif", letterSpacing:".06em", cursor:analysing?"not-allowed":"pointer", marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
          {analysing && <span style={{ width:14,height:14,border:"2px solid #F0EEE8",borderTopColor:"transparent",borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite" }}/>}
          {analysing ? "ANALYSING..." : `ANALYSE GW${fromGw}–GW${toGw}`}
        </button>
      </div>

      {result && (<>
        {/* Section 1 — Best Players */}
        <SectionBlock title="Best Players This Run" subtitle={`Top 20 across all positions · GW${fromGw}–${toGw}`}>
          <MGWPlayerTable players={result.top20} gwNums={result.gwNums} squadIds={squadIds} />
        </SectionBlock>

        {/* Section 2 — Squad Analysis */}
        <SectionBlock title="Your Squad Analysis" subtitle="Current starters ranked by projected multi-GW score">
          <MGWPlayerTable players={result.mySquadAnalysis} gwNums={result.gwNums} squadIds={squadIds} posAvg={result.posAvg} showKeepBadge />
        </SectionBlock>

        {/* Section 3 — Transfer Targets */}
        <SectionBlock title="Transfer Targets" subtitle="Players below position average — top replacements within budget">
          {result.transferTargets.length===0 ? (
            <div style={{ padding:"12px 0", fontSize:12, color:C.green, fontWeight:600 }}>Your squad looks strong for this run. No urgent transfers needed.</div>
          ) : result.transferTargets.map((t,i)=>(
            <div key={i} style={{ marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
                <div style={{ background:C.amberDim, border:`1px solid ${C.amber}44`, borderRadius:5, padding:"3px 9px", fontSize:10, color:C.amber, fontWeight:700 }}>CONSIDER SELLING</div>
                <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{t.out.name}</span>
                <span style={{ fontSize:10, color:C.muted }}>{t.out.team} · {t.out.pos} · £{t.out.price?.toFixed(1)}m · Projected: {t.out.multiGwScore}pts</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:8 }}>
                {t.targets.map((target,j)=>(
                  <div key={j} style={{ background:C.buyBg, border:`1px solid ${C.green}33`, borderRadius:8, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:C.green }}>{target.name}</div>
                      <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{target.team} · £{target.price?.toFixed(1)}m · {target.own?.toFixed(1)}% owned</div>
                      <div style={{ display:"flex", gap:3, marginTop:8, flexWrap:"wrap" }}>
                        {target.fixtureRun.map(f=><MGWFdrBadge key={f.gw} fdr={f.fdr} blank={f.blank} label={`GW${f.gw}`}/>)}
                      </div>
                    </div>
                    <div style={{ textAlign:"center", flexShrink:0 }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:900, color:C.accent, lineHeight:1 }}>{target.multiGwScore}</div>
                      <div style={{ fontSize:9, color:C.muted }}>proj</div>
                      <div style={{ fontSize:11, fontWeight:700, color:target.gain>=0?C.green:C.red, marginTop:3 }}>{target.gain>=0?"+":""}{target.gain}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </SectionBlock>

        {/* Section 4 — Chip Strategy */}
        <SectionBlock title="Chip Strategy" subtitle={`Recommendations based on GW${fromGw}–GW${toGw} fixture data`}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
            <ChipCard icon="👑" name="Triple Captain" color={C.amber}
              rec={`Best GW: GW${result.chipStrategy.bestTcGw?.gw}`}
              detail={`${result.top20[0]?.name} projects strongest over this run (${result.top20[0]?.multiGwScore}pts). GW${result.chipStrategy.bestTcGw?.gw} has the highest top-player average.`}
            />
            <ChipCard icon="📈" name="Bench Boost" color={C.green}
              rec={`Best GW: GW${result.chipStrategy.bestBbGw?.gw}`}
              detail={`Your bench projects most points in GW${result.chipStrategy.bestBbGw?.gw}. Activate when your bench players all have good fixtures.`}
            />
            {result.chipStrategy.blankGws.length>0 ? (
              <ChipCard icon="⚡" name="Free Hit" color={C.accent}
                rec={`Consider GW${result.chipStrategy.blankGws[0]}`}
                detail={`GW${result.chipStrategy.blankGws.join(", GW")} ${result.chipStrategy.blankGws.length>1?"have":"has"} reduced fixtures — Free Hit could be decisive here.`}
              />
            ) : (
              <ChipCard icon="⚡" name="Free Hit" color={C.muted}
                rec="No blanks detected in this range"
                detail="Hold your Free Hit for a blank or double gameweek later in the season."
              />
            )}
          </div>
        </SectionBlock>

        {/* AI Summary */}
        <div style={{ marginBottom:24, textAlign:"center" }}>
          <button onClick={getAiSummary} disabled={aiLoading}
            style={{ background:aiLoading?C.border:C.accent, color:"#F0EEE8", border:"none", borderRadius:8, padding:"12px 28px", fontSize:13, fontWeight:800, fontFamily:"'Syne',sans-serif", letterSpacing:".06em", cursor:aiLoading?"not-allowed":"pointer", display:"inline-flex", alignItems:"center", gap:8 }}>
            {aiLoading && <span style={{ width:14,height:14,border:"2px solid #F0EEE8",borderTopColor:"transparent",borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite" }}/>}
            {aiLoading ? "GETTING AI ANALYSIS..." : `GET AI ANALYSIS FOR GW${fromGw}–GW${toGw} ⚡`}
          </button>
          {aiSummary && (
            <div style={{ marginTop:16, background:C.panel, border:`1px solid ${C.accent}44`, borderRadius:10, padding:20, textAlign:"left", maxWidth:700, margin:"16px auto 0" }}>
              <div style={{ fontSize:9, color:C.accent, fontWeight:800, letterSpacing:".12em", marginBottom:10 }}>AI TACTICAL SUMMARY · GW{fromGw}–GW{toGw}</div>
              <div style={{ fontSize:13, color:C.text, lineHeight:1.8 }}>{aiSummary}</div>
            </div>
          )}
        </div>
      </>)}
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav({activeSection, setSection}){
  const items = ["Assistant Manager","xGI Stats","Leagues & Cups","GW Planner","Future Planner","AI Transfers","Captain Picks","Chips","Fixtures"];
  return (
    <div style={{background:C.nav,borderBottom:`1px solid #3A3A38`,padding:"0 28px",display:"flex",alignItems:"center",gap:0,overflowX:"auto",justifyContent:"center"}}>
      {items.map(item=>{
        const active = activeSection===item;
        return (
          <button key={item} onClick={()=>setSection(item)} style={{
            background:"transparent",border:"none",borderBottom:`2px solid ${active?C.accentNav:"transparent"}`,
            color:active?"#F0EEE8":"#7A7A72",padding:"14px 14px",fontSize:11,fontWeight:active?700:500,
            letterSpacing:".02em",cursor:"pointer",whiteSpace:"nowrap",transition:"color .15s,border-color .15s",
            fontFamily:"'Inter',sans-serif",flex:1,textAlign:"center",
          }}>{item}</button>
        );
      })}
    </div>
  );
}

// ── Player List Panel ─────────────────────────────────────────────────────────
function PlayerListPanel({allPlayers, filterPos, setFilterPos, sortBy, setSortBy, searchQ, setSearchQ}){
  const positions = ["All","GKP","DEF","MID","FWD"];
  const filtered = allPlayers
    .filter(p=>filterPos==="All"||p.pos===filterPos)
    .filter(p=>!searchQ||p.name.toLowerCase().includes(searchQ.toLowerCase()))
    .sort((a,b)=>{
      if(sortBy==="ts")   return b.ts-a.ts;
      if(sortBy==="form") return b.form-a.form;
      if(sortBy==="pred") return b.predicted-a.predicted;
      if(sortBy==="xgi")  return (b.xGI90||0)-(a.xGI90||0);
      if(sortBy==="ict")  return (b.ict||0)-(a.ict||0);
      if(sortBy==="ppg")  return (b.ppg||0)-(a.ppg||0);
      return b.price-a.price;
    });

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        {/* Position filter */}
        <div style={{display:"flex",gap:3,marginBottom:6}}>
          {positions.map(pos=>{
            const posCol = pos==="All"?C.accent:pos==="GKP"?C.amber:pos==="DEF"?C.green:pos==="MID"?"#4A80E8":C.red;
            const active = filterPos===pos;
            return (
              <button key={pos} onClick={()=>setFilterPos(pos)} style={{flex:1,padding:"4px 2px",borderRadius:4,fontSize:9,fontWeight:700,background:active?posCol+"33":"transparent",color:active?posCol:C.muted,border:`1px solid ${active?posCol:C.border}`,cursor:"pointer",transition:"all .15s"}}>
                {pos}
              </button>
            );
          })}
        </div>
        {/* Sort */}
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:5,color:C.text,fontSize:10,padding:"5px 7px",marginBottom:5}}>
          <option value="pred">Sort: Predicted pts</option>
          <option value="ts">Sort: Total score</option>
          <option value="ppg">Sort: Pts per game</option>
          <option value="form">Sort: Form</option>
          <option value="xgi">Sort: xGI/90</option>
          <option value="ict">Sort: ICT index</option>
          <option value="price">Sort: Price</option>
        </select>
        {/* Search */}
        <input placeholder="Search player..." value={searchQ||""} onChange={e=>setSearchQ(e.target.value)}
          style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:5,color:C.text,fontSize:10,padding:"5px 7px",outline:"none"}}/>
      </div>

      {/* Column headers */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 30px 32px 36px 30px",gap:2,padding:"5px 10px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        {["Player","£","Pred","TS","FDR"].map(h=>(
          <div key={h} style={{fontSize:8,color:C.muted,fontWeight:700,letterSpacing:".08em",textAlign:h==="Player"?"left":"right"}}>{h}</div>
        ))}
      </div>

      {/* Player rows */}
      <div style={{flex:1,overflowY:"auto"}}>
        {filtered.map((p,i)=>(
          <div key={p.id||i} style={{display:"grid",gridTemplateColumns:"1fr 30px 32px 36px 30px",gap:2,padding:"6px 10px",borderBottom:`1px solid ${C.border}33`,alignItems:"center",background:i%2===0?C.panel:C.bg}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{width:5,height:5,borderRadius:"50%",background:POS_COLOR[p.pos],flexShrink:0,display:"inline-block"}}/>
                <span style={{fontSize:11,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:3,marginTop:1}}>
                <span style={{width:4,height:4,borderRadius:"50%",background:FDR_COLOR[p.fdr],display:"inline-block"}}/>
                <span style={{fontSize:9,color:p.fdr===5?C.red:C.muted}}>{p.fix}</span>
              </div>
            </div>
            <div style={{fontSize:10,color:C.muted,textAlign:"right"}}>£{p.price}</div>
            <div style={{fontSize:11,fontWeight:700,color:p.fdr===5?C.red:C.accent,textAlign:"right"}}>{p.fdr===5?"–":p.predicted}</div>
            <div style={{fontSize:11,fontWeight:700,color:C.text,textAlign:"right"}}>{p.ts}</div>
            <div style={{textAlign:"right"}}>
              <span style={{display:"inline-block",width:20,height:20,borderRadius:3,background:FDR_COLOR[p.fdr]+"33",color:FDR_COLOR[p.fdr]||C.muted,fontSize:9,fontWeight:800,lineHeight:"20px",textAlign:"center"}}>{p.fdr}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Right Panel ───────────────────────────────────────────────────────────────
function RightPanel({section, data, selectedPlayer}){
  if(section==="Fixtures") return <FixturesPanel fixtures={data.fixtures}/>;
  if(section==="Captain Picks") return <CaptainPanel picks={data.captainPicks}/>;
  if(section==="Chips") return <ChipsPanel chips={data.chips}/>;
  if(section==="AI Transfers") return <AITransfersPanel transfers={data.transferSuggestions} players={data.players} bank={data.bank}/>;
  if(section==="xGI Stats") return <StatsPanel players={data.players} allPlayers={data.allPlayers}/>;

  // Default: Assistant Manager right rail
  return (
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
      {/* Assistant Manager header */}
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,background:C.nav}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <div style={{width:32,height:32,borderRadius:8,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🤖</div>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:"#F0EEE8"}}>Assistant Manager</div>
            <div style={{fontSize:10,color:"#7A7A72"}}>Powered by pFPL! AI</div>
          </div>
        </div>
      </div>

      {/* Transfer recommendations */}
      <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".12em",marginBottom:10,textAlign:"center"}}>ALGORITHM TRANSFER RECOMMENDATIONS</div>
        {data.transferSuggestions.slice(0,2).map((t,i)=>(
          <div key={i} style={{borderRadius:8,marginBottom:8,border:`1px solid ${C.border}`,overflow:"hidden"}}>
            <div style={{display:"flex",gap:0,marginBottom:0}}>
              <div style={{flex:1,background:C.sellBg,padding:"8px 10px",borderRight:`1px solid ${C.border}`}}>
                <div style={{fontSize:9,color:C.red,fontWeight:800,letterSpacing:".1em",marginBottom:2}}>SELL</div>
                <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:"'Inter',sans-serif"}}>{t.out}</div>
                <div style={{fontSize:9,color:C.muted}}>{t.outTeam} · £{t.outPrice}m</div>
              </div>
              <div style={{flex:1,background:C.buyBg,padding:"8px 10px"}}>
                <div style={{fontSize:9,color:C.green,fontWeight:800,letterSpacing:".1em",marginBottom:2}}>BUY</div>
                <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:"'Inter',sans-serif"}}>{t.in}</div>
                <div style={{fontSize:9,color:C.muted}}>{t.inTeam} · £{t.inPrice}m</div>
              </div>
            </div>
            <div style={{padding:"6px 10px",background:C.card,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <Pill color="green" small>{t.gain} pts</Pill>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:40,height:3,background:C.border,borderRadius:2}}>
                  <div style={{width:t.conf+"%",height:"100%",background:t.conf>=80?C.green:C.amber,borderRadius:2}}/>
                </div>
                <span style={{fontSize:11,fontWeight:800,color:t.conf>=80?C.green:C.amber}}>{t.conf}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Captain picks */}
      <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".12em",marginBottom:10,textAlign:"center"}}>ALGORITHM CAPTAIN RECOMMENDATIONS</div>
        {data.captainPicks.slice(0,2).map((p,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,padding:"8px 10px",background:i===0?C.captBg:C.card,borderRadius:8,border:`1px solid ${i===0?C.captBorder:C.border}`}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:POS_COLOR["MID"]+"22",border:`2px solid ${POS_COLOR["MID"]}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:POS_COLOR["MID"],flexShrink:0}}>
              {p.name.slice(0,2).toUpperCase()}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:"'Inter',sans-serif"}}>{p.name}</div>
              <div style={{fontSize:10,color:C.muted}}>{p.fix}</div>
            </div>
            {i===0&&<div style={{width:8,height:8,borderRadius:"50%",background:C.accent,flexShrink:0}}/>}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{padding:"12px 14px"}}>
        <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".12em",marginBottom:10,textAlign:"center"}}>SQUAD STATS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["Pred Points","51",C.accent],["Bank","£"+data.bank+"m",C.green],["Team Value","£"+data.teamValue+"m",C.text],["Overall Rank","#"+data.rank.toLocaleString(),C.amber]].map(([l,v,col])=>(
            <div key={l} style={{background:C.surface,borderRadius:7,padding:"8px 10px",border:`1px solid ${C.border}`}}>
              <div style={{fontSize:17,fontWeight:700,color:col,fontFamily:"'Inter',sans-serif",lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{v}</div>
              <div style={{fontSize:9,color:C.muted,marginTop:3,letterSpacing:".08em"}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const FDR_STYLE = {
  1: { bg:"#D0E8D8", text:"#3A8A5A" },
  2: { bg:"#E4EED0", text:"#6A9A30" },
  3: { bg:"#EEE0B0", text:"#8A6010" },
  4: { bg:"#EED8C8", text:"#903820" },
  5: { bg:"#EED8C8", text:"#903820" },
};
function FixturesPanel({fixtures}){
  return (
    <div style={{padding:"14px 16px"}}>
      <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".12em",marginBottom:10,textAlign:"center"}}>UPCOMING FIXTURES</div>
      <div style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap"}}>
        {[1,2,3,4,5].map(d=>(
          <div key={d} style={{display:"flex",alignItems:"center",gap:4,background:FDR_STYLE[d].bg,borderRadius:4,padding:"2px 7px"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:FDR_STYLE[d].text}}/>
            <span style={{fontSize:9,color:FDR_STYLE[d].text,fontWeight:700}}>FDR {d}</span>
          </div>
        ))}
      </div>
      {fixtures.map((f,i)=>{
        const s = FDR_STYLE[f.fdr] || FDR_STYLE[3];
        return (
          <div key={i} style={{display:"flex",alignItems:"center",padding:"8px 10px",borderRadius:6,marginBottom:4,background:s.bg,border:`1px solid ${s.text}22`,gap:8}}>
            <div style={{fontSize:10,color:s.text,width:80,flexShrink:0,opacity:0.75}}>{f.time}</div>
            <div style={{flex:1,textAlign:"right",fontSize:12,fontWeight:600,color:s.text}}>{f.home}</div>
            <div style={{fontSize:10,color:s.text,padding:"2px 7px",background:"rgba(0,0,0,0.08)",borderRadius:4,flexShrink:0}}>vs</div>
            <div style={{flex:1,fontSize:12,fontWeight:600,color:s.text}}>{f.away}</div>
          </div>
        );
      })}
    </div>
  );
}

function CaptainPanel({picks}){
  return (
    <div style={{padding:"14px 16px"}}>
      <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".12em",marginBottom:12,textAlign:"center"}}>CAPTAIN RECOMMENDATIONS</div>
      {picks.map((p,i)=>(
        <div key={i} style={{background:i===0?C.captBg:C.card,border:`1px solid ${i===0?C.captBorder:C.border}`,borderRadius:10,padding:"14px",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{position:"relative",flexShrink:0}}>
              <AvatarCircle name={p.name} pos={p.pos||"MID"} size={44}/>
              {i===0&&<div style={{position:"absolute",bottom:-2,right:-2,width:16,height:16,borderRadius:"50%",background:C.accent,color:"#fff",fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>C</div>}
              {i===1&&<div style={{position:"absolute",bottom:-2,right:-2,width:16,height:16,borderRadius:"50%",background:C.green,color:"#fff",fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>V</div>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'Inter',sans-serif"}}>{p.name}</div>
                {i===0&&<Pill color="accent" small>TOP PICK</Pill>}
              </div>
              <div style={{fontSize:10,color:C.muted,marginBottom:4}}>{p.team} · {p.fix} · {p.own}% owned</div>
              {p.xgi!==undefined&&<XGBar val={p.xgi||0} max={1.0} color={C.green} label="xGI/90"/>}
            </div>
            <div style={{textAlign:"center",flexShrink:0,minWidth:52}}>
              <div style={{fontSize:22,fontWeight:700,color:i===0?C.accent:C.text,fontFamily:"'Inter',sans-serif",lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{p.pred*2}</div>
              <div style={{fontSize:9,color:C.muted,marginTop:2}}>2× PRED</div>
              <div style={{fontSize:11,color:p.conf>=75?C.green:C.amber,fontWeight:700,marginTop:4}}>{p.conf}%</div>
              <div style={{fontSize:8,color:C.muted}}>conf</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChipsPanel({chips}){
  return (
    <div style={{padding:"14px 16px"}}>
      <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".12em",marginBottom:12,textAlign:"center"}}>CHIPS ASSISTANT</div>
      {chips.map((c,i)=>(
        <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <div style={{fontSize:20}}>{c.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:C.text}}>{c.name}</div>
              <div style={{fontSize:11,color:C.muted}}>Projected: {c.pts} pts</div>
            </div>
          </div>
          <div style={{background:C.surface,borderRadius:6,padding:"8px 10px",fontSize:11,color:C.muted,lineHeight:1.55}}>{c.rec}</div>
        </div>
      ))}
    </div>
  );
}

function AITransfersPanel({transfers, players, bank}){
  const [count, setCount] = useState(1);

  // Use pre-computed transfers from handleLoad (sliced to count)
  const list = (transfers||[]).slice(0, count);

  return (
    <div style={{padding:"14px 16px"}}>
      <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".12em",marginBottom:10,textAlign:"center"}}>AI TRANSFER PLANNER</div>

      {/* 1-5 selector with Wildcard / Free Hit labels */}
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:4,background:C.bg,borderRadius:8,padding:4}}>
          {[1,2,3,4,5].map((n,idx)=>(
            <div key={n} style={{flex:1,textAlign:"center"}}>
              <div style={{fontSize:8,color:C.muted,marginBottom:3,whiteSpace:"nowrap",minHeight:12}}>
                {idx===0?"Wildcard":idx===4?"Free Hit":""}
              </div>
              <button onClick={()=>setCount(n)} style={{width:"100%",padding:"8px 4px",borderRadius:6,fontSize:13,fontWeight:900,fontFamily:"'Syne',sans-serif",background:count===n?C.accent:"transparent",color:count===n?"#F0EEE8":C.muted,border:`1px solid ${count===n?C.accent:C.border}`,cursor:"pointer",transition:"all .15s"}}>
                {n}
              </button>
            </div>
          ))}
        </div>
      </div>

      {list.length===0&&<div style={{fontSize:12,color:C.muted,textAlign:"center",padding:"20px 0"}}>Load your team to see transfer suggestions.</div>}
      {list.map((t,i)=>(
        <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px",marginBottom:10}}>
          <div style={{fontSize:9,color:C.muted,letterSpacing:".1em",fontWeight:700,marginBottom:10}}>TRANSFER {i+1} OF {count}</div>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <div style={{flex:1,background:C.sellBg,borderRadius:7,padding:"8px 10px",border:`1px solid ${C.red}33`}}>
              <div style={{fontSize:8,color:C.red,fontWeight:800,letterSpacing:".1em",marginBottom:4}}>SELL</div>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <AvatarCircle name={t.out} pos={t.outPos||"MID"} size={30}/>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:"'Inter',sans-serif"}}>{t.out}</div>
                  <div style={{fontSize:9,color:C.muted}}>{t.outTeam} · £{t.outPrice}m</div>
                </div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",color:C.muted,fontSize:18,flexShrink:0}}>→</div>
            <div style={{flex:1,background:C.buyBg,borderRadius:7,padding:"8px 10px",border:`1px solid ${C.green}33`}}>
              <div style={{fontSize:8,color:C.green,fontWeight:800,letterSpacing:".1em",marginBottom:4}}>BUY</div>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <AvatarCircle name={t.in} pos={t.inPos||"MID"} size={30}/>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:"'Inter',sans-serif"}}>{t.in}</div>
                  <div style={{fontSize:9,color:C.muted}}>{t.inTeam} · £{t.inPrice}m</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{fontSize:10,color:C.muted,lineHeight:1.5,marginBottom:8}}>{t.reason}</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <Pill color="green" small>{t.gain} pts</Pill>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:40,height:3,background:C.border,borderRadius:2}}>
                <div style={{width:(t.conf||0)+"%",height:"100%",background:(t.conf||0)>=80?C.green:C.amber,borderRadius:2}}/>
              </div>
              <span style={{fontSize:11,fontWeight:800,color:(t.conf||0)>=80?C.green:C.amber}}>{t.conf}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Optimiser Modal ───────────────────────────────────────────────────────────
function OptimiserModal({onClose, onApply, squad, allPlayers, bank}){
  const [criteria,  setCriteria]  = useState("projected");
  const [maxPrice,  setMaxPrice]  = useState("unlimited");
  const [maxOwn,    setMaxOwn]    = useState("unlimited");
  const [xferCount, setXferCount] = useState(1);
  const [running,   setRunning]   = useState(false);
  const [results,   setResults]   = useState(null);

  const criteriaOptions = [
    {id:"projected", label:"To maximise projected points",       desc:"Uses xGI/90, ICT, form & fixture"},
    {id:"monthly",   label:"To win the monthly cup / H2H match", desc:"High-floor consistent picks — PPG + predicted blend"},
    {id:"ownership", label:"Based on top 1k player ownership",   desc:"Targets differentials held by elite managers"},
    {id:"total",     label:"Based on total FPL points so far",   desc:"Season-long proven performers"},
    {id:"ppg",       label:"By total FPL points per game",       desc:"Efficiency-based selection"},
    {id:"xfpl",      label:"Based on total xFPL so far",         desc:"Expected points — removes luck factor"},
  ];

  const runOptimiser = () => {
    setRunning(true);
    setTimeout(() => {
      const starters = squad.filter(p=>!p.bench);
      const blanks   = starters.filter(p=>p.fdr===5||p.status==="doubt").sort((a,b)=>a.predicted-b.predicted);
      const weak     = starters.filter(p=>p.fdr!==5&&p.status!=="doubt").sort((a,b)=>a.predicted-b.predicted);
      const toReplace = [...blanks, ...weak].slice(0, xferCount);
      let totalBank = bank;
      const transfers = [];
      const usedIds = new Set(squad.map(p=>p.id));
      for (const out of toReplace) {
        const budget = out.price + totalBank;
        const maxPriceCap = maxPrice==="unlimited" ? 999 : parseFloat(maxPrice);
        const maxOwnCap   = maxOwn==="unlimited"   ? 100 : parseFloat(maxOwn);
        const candidates = allPlayers
          .filter(p => p.pos===out.pos && p.id!==out.id && !usedIds.has(p.id) &&
            p.price<=Math.min(budget,maxPriceCap) && (p.own||0)<=maxOwnCap &&
            p.status!=="injured" && p.status!=="suspended")
          .map(p => {
            let score = p.predicted||0;
            if (criteria==="ppg")      score = p.ppg||0;
            if (criteria==="total")    score = p.ts||0;
            if (criteria==="ownership") score = p.own||0;
            if (criteria==="xfpl")     score = (p.xGI90||0)*15 + (p.ppg||0);
            if (criteria==="monthly")  score = (p.ppg||0)*0.55 + (p.predicted||0)*0.45;
            return {...p, score};
          })
          .sort((a,b) => b.score-a.score);
        const inPlayer = candidates[0];
        if (inPlayer) {
          transfers.push({out, in: inPlayer, gain:(inPlayer.predicted||0)-(out.predicted||0)});
          usedIds.add(inPlayer.id);
          totalBank = Math.round((totalBank-(inPlayer.price-out.price))*10)/10;
        }
      }
      const captainPool = starters
        .filter(p=>p.fdr!==5)
        .map(p=>({...p, captScore:p.predicted||0}))
        .concat(transfers.map(t=>({...t.in, captScore:t.in.predicted||0})))
        .sort((a,b)=>b.captScore-a.captScore);
      setResults({ transfers, captain:captainPool[0], vice:captainPool[1], newBank:totalBank });
      setRunning(false);
    }, 1200);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:14,width:"100%",maxWidth:560,maxHeight:"90vh",overflow:"auto",position:"relative"}}>
        <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:"transparent",border:"none",color:C.muted,fontSize:20,cursor:"pointer",lineHeight:1}}>×</button>

        {!results ? (
          <div style={{padding:24}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{width:48,height:48,borderRadius:"50%",background:C.accentDim,border:`1px solid ${C.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 10px"}}>⚡</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:900,color:C.text}}>Auto Squad Optimisation</div>
              <div style={{fontSize:12,color:C.muted,marginTop:4}}>AI-powered algorithm using xGI, ICT, form & fixture data</div>
            </div>

            {/* Transfer count */}
            <div style={{marginBottom:18}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:".1em",marginBottom:10}}>HOW MANY TRANSFERS?</div>
              <div style={{display:"flex",gap:4,background:C.bg,borderRadius:8,padding:4}}>
                {[1,2,3,4,5].map((n,idx)=>(
                  <div key={n} style={{flex:1,textAlign:"center"}}>
                    {idx===0&&<div style={{fontSize:8,color:C.muted,marginBottom:3,whiteSpace:"nowrap"}}>Wildcard</div>}
                    {idx>0&&idx<4&&<div style={{fontSize:8,color:"transparent",marginBottom:3}}>·</div>}
                    {idx===4&&<div style={{fontSize:8,color:C.muted,marginBottom:3,whiteSpace:"nowrap"}}>Free Hit</div>}
                    <button onClick={()=>setXferCount(n)} style={{width:"100%",padding:"8px 4px",borderRadius:6,fontSize:13,fontWeight:800,fontFamily:"'Syne',sans-serif",background:xferCount===n?C.accent:"transparent",color:xferCount===n?"#F0EEE8":C.muted,border:`1px solid ${xferCount===n?C.accent:C.border}`,cursor:"pointer",transition:"all .15s"}}>
                      {n}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Criteria */}
            <div style={{marginBottom:18}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:".1em",marginBottom:10}}>OPTIMISE BY</div>
              {criteriaOptions.map(opt=>(
                <div key={opt.id} onClick={()=>setCriteria(opt.id)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",marginBottom:6,borderRadius:8,border:`1px solid ${criteria===opt.id?C.accent:C.border}`,background:criteria===opt.id?"#2C3D4F":C.bg,cursor:"pointer",transition:"all .15s"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:criteria===opt.id?C.accent:C.text}}>{opt.label}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:1}}>{opt.desc}</div>
                  </div>
                  <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${criteria===opt.id?C.accent:C.border}`,background:criteria===opt.id?C.accent:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {criteria===opt.id&&<div style={{width:6,height:6,borderRadius:"50%",background:"#fff"}}/>}
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
              {[["Max price",maxPrice,setMaxPrice,["unlimited","5.0","6.0","7.0","8.0","9.0","10.0"]],
                ["Max ownership %",maxOwn,setMaxOwn,["unlimited","5","10","15","20","30"]]].map(([label,val,setter,opts])=>(
                <div key={label}>
                  <div style={{fontSize:10,color:C.muted,fontWeight:700,marginBottom:5}}>{label.toUpperCase()}</div>
                  <select value={val} onChange={e=>setter(e.target.value)} style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:12,padding:"8px 10px"}}>
                    {opts.map(o=><option key={o} value={o}>{o==="unlimited"?"Unlimited":label.includes("price")?`£${o}m`:`${o}%`}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <button onClick={runOptimiser} disabled={running} style={{width:"100%",background:running?C.border:"#2C2C2A",color:"#F0EEE8",borderRadius:20,padding:14,fontSize:14,fontWeight:800,fontFamily:"'Syne',sans-serif",letterSpacing:".1em",border:"none",cursor:"pointer"}}>
              {running
                ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span style={{width:14,height:14,border:`2px solid ${C.dim}`,borderTopColor:"#F0EEE8",borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite"}}/>RUNNING ALGORITHM...</span>
                : "⚡ RUN OPTIMISER"}
            </button>
          </div>
        ) : (
          <div style={{padding:24}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{width:48,height:48,borderRadius:"50%",background:C.greenDim,border:`1px solid ${C.green}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 10px"}}>✓</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:900,color:C.text}}>Algorithm recommended transfers!</div>
              <div style={{fontSize:11,color:C.muted,marginTop:4}}>Review and apply to your squad view</div>
            </div>

            {results.transfers.length>0 ? (
              <>
                <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".1em",marginBottom:12,textAlign:"center"}}>YOUR TRANSFERS</div>
                {results.transfers.map((t,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:16,padding:"14px 16px",background:C.bg,borderRadius:10,border:`1px solid ${C.border}`}}>
                    <div style={{textAlign:"center"}}>
                      <AvatarCircle name={t.out.name} pos={t.out.pos} size={52}/>
                      <div style={{fontSize:12,fontWeight:700,color:C.text,marginTop:6}}>{t.out.name}</div>
                      <div style={{fontSize:10,color:C.red}}>£{t.out.price}m OUT</div>
                      <div style={{fontSize:9,color:C.muted}}>Pred: {t.out.predicted} pts</div>
                    </div>
                    <div style={{fontSize:24,color:C.muted}}>→</div>
                    <div style={{textAlign:"center"}}>
                      <AvatarCircle name={t.in.name} pos={t.in.pos} size={52}/>
                      <div style={{fontSize:12,fontWeight:700,color:C.text,marginTop:6}}>{t.in.name}</div>
                      <div style={{fontSize:10,color:C.green}}>£{t.in.price}m IN</div>
                      <div style={{fontSize:9,color:C.muted}}>Pred: {t.in.predicted} pts</div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div style={{textAlign:"center",padding:20,color:C.green,fontSize:13,fontWeight:700}}>✅ Squad looks optimal — no transfers needed!</div>
            )}

            <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".1em",marginBottom:12,marginTop:8}}>ALGORITHM CAPTAIN SELECTION</div>
            <div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:20}}>
              {[results.captain, results.vice].filter(Boolean).map((p,i)=>(
                <div key={i} style={{textAlign:"center",padding:"14px 20px",background:i===0?C.captBg:C.bg,borderRadius:10,border:`1px solid ${i===0?C.captBorder:C.border}`,flex:1}}>
                  <div style={{position:"relative",display:"inline-block"}}>
                    <AvatarCircle name={p.name} pos={p.pos} size={52}/>
                    <div style={{position:"absolute",bottom:-2,right:-2,width:18,height:18,borderRadius:"50%",background:i===0?C.accent:C.green,color:C.bg,fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{i===0?"C":"V"}</div>
                  </div>
                  <div style={{fontSize:12,fontWeight:700,color:C.text,marginTop:8}}>{p.name}</div>
                  <div style={{fontSize:9,color:C.muted}}>{i===0?"Captain":"Vice Captain"}</div>
                  <div style={{fontSize:11,color:i===0?C.accent:C.green,fontWeight:700,marginTop:4}}>Pred: {(p.predicted||0)*2} pts (2×)</div>
                </div>
              ))}
            </div>

            <div style={{textAlign:"center",marginBottom:16,fontSize:11,color:C.muted}}>
              Bank after transfers: <span style={{color:results.newBank>=0?C.green:C.red,fontWeight:700}}>£{results.newBank}m</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <button onClick={()=>setResults(null)} style={{padding:12,background:"transparent",border:`1px solid #B0ADA4`,borderRadius:20,color:"#4A4844",fontSize:12,fontWeight:600,cursor:"pointer"}}>← Back</button>
              <button onClick={()=>{onApply&&onApply(results);onClose();}} style={{padding:12,background:"#2C2C2A",border:"none",borderRadius:20,color:"#F0EEE8",fontSize:12,fontWeight:800,fontFamily:"'Syne',sans-serif",letterSpacing:".08em",cursor:"pointer"}}>APPLY TO SQUAD</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── xGI Stats Panel ───────────────────────────────────────────────────────────
function StatsPanel({players, allPlayers}){
  const [view, setView] = useState("squad");
  const source = view==="squad" ? (players||[]).filter(p=>!p.bench) : (allPlayers||[]);
  const sorted = [...source].sort((a,b)=>(b.xGI90||0)-(a.xGI90||0)).slice(0,12);
  return (
    <div style={{padding:"12px 14px"}}>
      <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".1em",marginBottom:10,textAlign:"center"}}>xGI / ICT STATS</div>
      <div style={{display:"flex",gap:4,marginBottom:12,background:C.bg,borderRadius:7,padding:3}}>
        {[["squad","My Squad"],["all","All Players"]].map(([id,label])=>(
          <button key={id} onClick={()=>setView(id)} style={{flex:1,padding:"6px",borderRadius:5,fontSize:10,fontWeight:700,background:view===id?C.accent:"transparent",color:view===id?"#F0EEE8":C.muted,border:"none",cursor:"pointer",transition:"all .15s"}}>
            {label}
          </button>
        ))}
      </div>
      {sorted.map(p=>(
        <div key={p.id} style={{marginBottom:12,padding:"10px 12px",background:C.bg,borderRadius:8,border:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <AvatarCircle name={p.name} pos={p.pos} size={28}/>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:C.text}}>{p.name}</div>
                <div style={{fontSize:9,color:C.muted}}>{p.team} · {p.fix}</div>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:16,fontWeight:900,color:C.accent,fontFamily:"'Syne',sans-serif",lineHeight:1}}>{p.predicted}</div>
              <div style={{fontSize:8,color:C.muted}}>pred pts</div>
            </div>
          </div>
          <XGBar val={p.xGI90||0}          max={1.0} color={C.green}  label="xGI/90"/>
          <XGBar val={(p.ict||0)/200}       max={1.0} color={C.accent} label="ICT (norm)"/>
          <XGBar val={Math.min(p.form/10,1)} max={1.0} color={C.amber}  label="Form"/>
        </div>
      ))}
    </div>
  );
}

// ── Leagues & Cups Panel ──────────────────────────────────────────────────────
function LeaguesPanel({ teamId, leagues, myEntryId, currentGw }) {
  const [tab, setTab] = useState("classic");
  const [selected, setSelected] = useState(null);
  const [selectedType, setSelectedType] = useState("classic");
  const [standings, setStandings] = useState(null);
  const [cupMatches, setCupMatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const [compareEntry, setCompareEntry] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(()=>{
    if(!compareEntry || !currentGw) { setCompareData(null); return; }
    setCompareLoading(true);
    setCompareData(null);
    fetchFPL(`/entry/${compareEntry.entry}/`).then(info=>{
      return fetchFPL(`/entry/${compareEntry.entry}/event/${currentGw}/picks/`).then(picks=>{
        setCompareData({ info, picks });
        setCompareLoading(false);
      });
    }).catch(()=>{ setCompareData({ error:true }); setCompareLoading(false); });
  },[compareEntry, currentGw]);

  const classicLeagues = (leagues?.classic || []).filter(l => l.league_type !== "s");
  const h2hLeagues = leagues?.h2h || [];
  const list = tab === "classic" ? classicLeagues : h2hLeagues;

  const loadStandings = async (league, type) => {
    setSelected(league);
    setSelectedType(type);
    setStandings(null);
    setCupMatches(null);
    setLoading(true);
    try {
      const endpoint = type === "h2h"
        ? `/leagues-h2h/${league.id}/standings/`
        : `/leagues-classic/${league.id}/standings/`;
      const res = await fetchFPL(endpoint);
      setStandings(res);
      // For H2H, also load current GW cup matches for head-to-head context
      if (type === "h2h") {
        try {
          const matches = await fetchFPL(`/leagues-h2h-matches/league/${league.id}/?event=${currentGw}`);
          setCupMatches(matches);
        } catch(_) {}
      }
    } catch(e) {
      setStandings({ error: true });
    }
    setLoading(false);
  };

  const results = standings?.standings?.results || [];
  const myEntry = results.find(r => r.entry === myEntryId);
  const myIdx   = results.findIndex(r => r.entry === myEntryId);
  const leader  = results[0];
  const above   = myIdx > 0 ? results[myIdx - 1] : null;

  // Find my current H2H match opponent
  const myMatch = cupMatches?.results?.find(m => m.entry_1_entry === myEntryId || m.entry_2_entry === myEntryId);
  const opponent = myMatch
    ? (myMatch.entry_1_entry === myEntryId
        ? { name: myMatch.entry_2_name, pts: myMatch.entry_2_total, gwPts: myMatch.entry_2_points }
        : { name: myMatch.entry_1_name, pts: myMatch.entry_1_total, gwPts: myMatch.entry_1_points })
    : null;
  const myMatchPts = myMatch
    ? (myMatch.entry_1_entry === myEntryId ? myMatch.entry_1_total : myMatch.entry_2_total)
    : null;

  return (
    <div style={{ display:"flex", height:"100%", minHeight:0, overflow:"hidden" }}>

      {/* Left — league list */}
      <div style={{ width:260, borderRight:`1px solid ${C.border}`, overflow:"auto", flexShrink:0, display:"flex", flexDirection:"column" }}>
        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          {[["classic","Classic"],["h2h","H2H / Cup"]].map(([id,label])=>(
            <button key={id} onClick={()=>{ setTab(id); setSelected(null); setStandings(null); setCupMatches(null); }}
              style={{ flex:1, padding:"11px", fontSize:11, fontWeight:700, background:"transparent", border:"none",
                borderBottom:`2px solid ${tab===id?C.accent:"transparent"}`, color:tab===id?C.accent:C.muted, cursor:"pointer" }}>
              {label}
            </button>
          ))}
        </div>

        {/* League list */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {list.length === 0 && (
            <div style={{ padding:16, fontSize:11, color:C.muted }}>No {tab} leagues found.</div>
          )}
          {list.map(l => {
            const rankUp = l.entry_rank < l.entry_last_rank;
            const rankDown = l.entry_rank > l.entry_last_rank;
            return (
              <div key={l.id} onClick={()=>loadStandings(l, tab)}
                style={{ padding:"11px 14px", borderBottom:`1px solid ${C.border}22`, cursor:"pointer",
                  background: selected?.id===l.id ? C.accentDim : "transparent",
                  borderLeft:`3px solid ${selected?.id===l.id ? C.accent : "transparent"}`,
                  transition:"background .15s" }}>
                <div style={{ fontSize:12, fontWeight:600, color: selected?.id===l.id ? C.accent : C.text,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.name}</div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3 }}>
                  <span style={{ fontSize:10, color:C.muted }}>Rank #{l.entry_rank?.toLocaleString()}</span>
                  {rankUp && <span style={{ fontSize:9, color:C.green }}>▲{l.entry_last_rank - l.entry_rank}</span>}
                  {rankDown && <span style={{ fontSize:9, color:C.red }}>▼{l.entry_rank - l.entry_last_rank}</span>}
                  {!rankUp && !rankDown && l.entry_last_rank > 0 && <span style={{ fontSize:9, color:C.muted }}>—</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right — standings */}
      <div style={{ flex:1, overflow:"auto", padding:20, minWidth:0 }}>

        {/* Empty state */}
        {!selected && (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:10 }}>
            <div style={{ fontSize:40 }}>🏆</div>
            <div style={{ fontSize:14, fontWeight:700, color:C.text }}>Select a league to view standings</div>
            <div style={{ fontSize:11, color:C.muted }}>Classic & H2H leagues loaded from your FPL profile</div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60 }}>
            <span style={{ width:28, height:28, border:`2px solid ${C.border}`, borderTopColor:C.accent, borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }}/>
          </div>
        )}

        {standings?.error && !loading && (
          <div style={{ padding:20, color:C.red, fontSize:12 }}>Failed to load standings. This league may be private or unavailable.</div>
        )}

        {standings && !standings.error && !loading && (
          <>
            {/* League header + my stats */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:900, color:C.text, marginBottom:4 }}>
                {standings.league?.name || selected.name}
              </div>
              {standings.league?.created && (
                <div style={{ fontSize:10, color:C.muted, marginBottom:12 }}>
                  Created {new Date(standings.league.created).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
                  {standings.league?.start_event ? ` · From GW${standings.league.start_event}` : ""}
                </div>
              )}

              {/* My stats bar */}
              {myEntry && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
                  {[
                    ["My Rank", `#${myEntry.rank?.toLocaleString()}`, C.accent],
                    ["Total Pts", myEntry.total, C.green],
                    ["GW Pts", myEntry.event_total, C.amber],
                    ...(leader && leader.entry !== myEntryId ? [["vs Leader", `-${leader.total - myEntry.total}`, C.red]] : [["Leader 🏆", myEntry.total, C.accent]]),
                    ...(above ? [["To Overtake", `-${above.total - myEntry.total}`, C.purple]] : []),
                  ].map(([l,v,col])=>(
                    <div key={l} style={{ background:C.surface, borderRadius:8, padding:"10px 14px", border:`1px solid ${C.border}`, minWidth:90 }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:900, color:col, lineHeight:1 }}>{v}</div>
                      <div style={{ fontSize:9, color:C.muted, marginTop:3, letterSpacing:".08em" }}>{l}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* H2H current match opponent card */}
              {opponent && myMatch && (
                <div style={{ background:C.captBg, border:`1px solid ${C.captBorder}`, borderRadius:10, padding:"12px 16px", marginBottom:16 }}>
                  <div style={{ fontSize:9, color:C.accent, fontWeight:800, letterSpacing:".12em", marginBottom:8 }}>GW{currentGw} H2H MATCH</div>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ flex:1, textAlign:"center" }}>
                      <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:2 }}>You</div>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:32, fontWeight:900, color:C.green, lineHeight:1 }}>{myMatchPts ?? "–"}</div>
                      <div style={{ fontSize:9, color:C.muted }}>pts</div>
                    </div>
                    <div style={{ fontSize:11, color:C.muted, fontWeight:700 }}>vs</div>
                    <div style={{ flex:1, textAlign:"center" }}>
                      <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{opponent.name}</div>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:32, fontWeight:900, color:C.amber, lineHeight:1 }}>{opponent.gwPts ?? "–"}</div>
                      <div style={{ fontSize:9, color:C.muted }}>pts</div>
                    </div>
                    <div style={{ background: (myMatchPts||0)>(opponent.gwPts||0) ? C.greenDim : C.redDim, borderRadius:8, padding:"8px 12px", border:`1px solid ${(myMatchPts||0)>(opponent.gwPts||0)?C.green:C.red}33` }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:900, color:(myMatchPts||0)>(opponent.gwPts||0)?C.green:C.red }}>
                        {(myMatchPts||0)>(opponent.gwPts||0) ? "WIN" : (myMatchPts||0)===(opponent.gwPts||0) ? "DRAW" : "LOSE"}
                      </div>
                      <div style={{ fontSize:9, color:C.muted }}>current</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Standings table */}
            <div style={{ background:C.card, borderRadius:10, border:`1px solid ${C.border}`, overflow:"hidden" }}>
              {/* Header */}
              <div style={{ display:"grid", gridTemplateColumns:"44px 1fr 120px 56px 64px 52px", padding:"8px 14px", borderBottom:`1px solid ${C.border}`, background:C.surface }}>
                {["#","Team Name","Manager","GW","Total",""].map(h=>(
                  <div key={h} style={{ fontSize:9, fontWeight:700, color:C.muted, letterSpacing:".08em", textAlign: h==="Team Name"||h==="Manager" ? "left" : "center" }}>{h}</div>
                ))}
              </div>

              {results.slice(0,50).map((r,i) => {
                const isMe = r.entry === myEntryId;
                const moved = r.last_rank > 0 ? r.last_rank - r.rank : 0;
                const isCompared = compareEntry?.entry === r.entry;
                return (
                  <div key={r.entry} style={{
                    display:"grid", gridTemplateColumns:"44px 1fr 120px 56px 64px 52px",
                    padding:"9px 14px", borderBottom:`1px solid ${C.border}22`,
                    background: isCompared ? `${C.purple}15` : isMe ? `${C.accent}12` : i%2===0 ? "transparent" : `${C.surface}66`,
                    borderLeft:`3px solid ${isCompared ? C.purple : isMe ? C.accent : "transparent"}`,
                    alignItems:"center",
                  }}>
                    <div style={{ fontSize:11, fontWeight:isMe?900:500, color:isMe?C.accent:C.muted, textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}>
                      {r.rank <= 3 ? ["🥇","🥈","🥉"][r.rank-1] : r.rank}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:isMe?800:600, color:isMe?C.accent:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {r.entry_name}
                        {isMe && <span style={{ marginLeft:5, fontSize:8, color:C.accent, fontWeight:800, background:C.accentDim, borderRadius:3, padding:"1px 4px", border:`1px solid ${C.accent}33` }}>YOU</span>}
                      </div>
                      {moved !== 0 && (
                        <div style={{ fontSize:8, color:moved>0?C.green:C.red }}>
                          {moved>0?"▲":"▼"}{Math.abs(moved)} from last week
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize:10, color:C.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.player_name}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:C.amber, textAlign:"center" }}>{r.event_total}</div>
                    <div style={{ fontSize:12, fontWeight:isMe?900:600, color:isMe?C.green:C.text, textAlign:"center" }}>{r.total}</div>
                    <div style={{ display:"flex", justifyContent:"center" }}>
                      {!isMe && (
                        <button onClick={()=>setCompareEntry(isCompared ? null : r)}
                          style={{ fontSize:9, fontWeight:700, padding:"3px 7px", borderRadius:4, border:`1px solid ${isCompared?C.purple:C.border}`,
                            background:isCompared?`${C.purple}25`:"transparent", color:isCompared?C.purple:C.muted, cursor:"pointer" }}>
                          {isCompared ? "✕" : "VS"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {standings?.standings?.has_next && (
                <div style={{ padding:"10px 14px", fontSize:10, color:C.muted, textAlign:"center", borderTop:`1px solid ${C.border}` }}>
                  Showing top 50 entries
                </div>
              )}
            </div>

            {/* Comparison panel */}
            {compareEntry && (
              <div style={{ marginTop:20, background:C.card, border:`1px solid ${C.purple}44`, borderRadius:10, padding:16 }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:9, color:C.purple, fontWeight:800, letterSpacing:".12em", marginBottom:3 }}>HEAD-TO-HEAD COMPARISON</div>
                    <div style={{ fontSize:16, fontWeight:800, color:C.text }}>{compareEntry.entry_name}</div>
                    <div style={{ fontSize:11, color:C.muted }}>{compareEntry.player_name}</div>
                  </div>
                  <button onClick={()=>setCompareEntry(null)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.muted, borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer" }}>Close</button>
                </div>

                {compareLoading && (
                  <div style={{ display:"flex", justifyContent:"center", padding:24 }}>
                    <span style={{ width:24, height:24, border:`2px solid ${C.border}`, borderTopColor:C.purple, borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }}/>
                  </div>
                )}
                {compareData?.error && (
                  <div style={{ color:C.red, fontSize:12, padding:"8px 0" }}>Failed to load this manager's data. Their profile may be private.</div>
                )}
                {compareData && !compareData.error && !compareLoading && (()=>{
                  const them = results.find(r=>r.entry===compareEntry.entry);
                  const gwHist = compareData.picks?.entry_history;
                  const chip = compareData.picks?.active_chip;
                  const ptsDiff = myEntry ? (myEntry.total - (them?.total || 0)) : null;
                  return (
                    <div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:10, alignItems:"center", marginBottom:14 }}>
                        {/* Me */}
                        <div style={{ textAlign:"center", background:C.surface, borderRadius:8, padding:"12px 8px", border:`1px solid ${C.accent}33` }}>
                          <div style={{ fontSize:9, color:C.accent, fontWeight:800, letterSpacing:".1em", marginBottom:6 }}>YOU</div>
                          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:900, color:C.text, lineHeight:1 }}>{myEntry?.total ?? "–"}</div>
                          <div style={{ fontSize:9, color:C.muted, marginTop:2 }}>TOTAL PTS</div>
                          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, color:C.amber, marginTop:8, lineHeight:1 }}>{myEntry?.event_total ?? "–"}</div>
                          <div style={{ fontSize:9, color:C.muted, marginTop:2 }}>GW{currentGw}</div>
                          <div style={{ fontSize:10, color:C.muted, marginTop:6 }}>#{myEntry?.rank?.toLocaleString() ?? "–"}</div>
                        </div>
                        {/* VS */}
                        <div style={{ textAlign:"center", padding:"0 8px" }}>
                          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:900, color:C.muted }}>VS</div>
                          {ptsDiff !== null && (
                            <div style={{ marginTop:6, fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800, color:ptsDiff>0?C.green:ptsDiff<0?C.red:C.muted }}>
                              {ptsDiff>0?"+":""}{ptsDiff}
                            </div>
                          )}
                        </div>
                        {/* Them */}
                        <div style={{ textAlign:"center", background:C.surface, borderRadius:8, padding:"12px 8px", border:`1px solid ${C.purple}33` }}>
                          <div style={{ fontSize:9, color:C.purple, fontWeight:800, letterSpacing:".1em", marginBottom:6, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{compareEntry.entry_name}</div>
                          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:900, color:C.text, lineHeight:1 }}>{them?.total ?? gwHist?.total_points ?? "–"}</div>
                          <div style={{ fontSize:9, color:C.muted, marginTop:2 }}>TOTAL PTS</div>
                          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, color:C.amber, marginTop:8, lineHeight:1 }}>{them?.event_total ?? gwHist?.points ?? "–"}</div>
                          <div style={{ fontSize:9, color:C.muted, marginTop:2 }}>GW{currentGw}</div>
                          <div style={{ fontSize:10, color:C.muted, marginTop:6 }}>#{them?.rank?.toLocaleString() ?? gwHist?.rank?.toLocaleString() ?? "–"}</div>
                        </div>
                      </div>
                      {/* Extra info pills */}
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {chip && (
                          <div style={{ background:C.accentDim, borderRadius:6, padding:"4px 10px", border:`1px solid ${C.accent}44` }}>
                            <span style={{ fontSize:10, color:C.accent, fontWeight:700 }}>Chip active: {chip}</span>
                          </div>
                        )}
                        {gwHist?.event_transfers !== undefined && (
                          <div style={{ background:C.surface, borderRadius:6, padding:"4px 10px", border:`1px solid ${C.border}` }}>
                            <span style={{ fontSize:10, color:C.muted }}>Transfers: </span>
                            <span style={{ fontSize:10, color:C.text, fontWeight:700 }}>{gwHist.event_transfers}</span>
                            {gwHist.event_transfers_cost > 0 && <span style={{ fontSize:10, color:C.red }}> (−{gwHist.event_transfers_cost}pts)</span>}
                          </div>
                        )}
                        {gwHist?.value !== undefined && (
                          <div style={{ background:C.surface, borderRadius:6, padding:"4px 10px", border:`1px solid ${C.border}` }}>
                            <span style={{ fontSize:10, color:C.muted }}>Squad value: </span>
                            <span style={{ fontSize:10, color:C.text, fontWeight:700 }}>£{(gwHist.value/10).toFixed(1)}m</span>
                          </div>
                        )}
                        {gwHist?.bank !== undefined && (
                          <div style={{ background:C.surface, borderRadius:6, padding:"4px 10px", border:`1px solid ${C.border}` }}>
                            <span style={{ fontSize:10, color:C.muted }}>Bank: </span>
                            <span style={{ fontSize:10, color:C.green, fontWeight:700 }}>£{(gwHist.bank/10).toFixed(1)}m</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const { user, isLoaded: userLoaded } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const [section, setSection] = useState("Assistant Manager");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [filterPos, setFilterPos] = useState("All");
  const [sortBy, setSortBy] = useState("pred");
  const [teamId, setTeamId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const bootstrapRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill team ID from saved Clerk metadata
  useEffect(() => {
    if (userLoaded && user?.unsafeMetadata?.fplTeamId) {
      setTeamId(String(user.unsafeMetadata.fplTeamId));
    }
  }, [userLoaded, user]);
  const [data, setData] = useState(null);
  const [showOptimModal, setShowOptimModal] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [appliedTransfers, setAppliedTransfers] = useState(null);
  const [originalPlayers, setOriginalPlayers] = useState(null);
  const [originalBank, setOriginalBank] = useState(null);

  const handleApplyOptimiser = (results) => {
    if (!data || !results?.transfers?.length) return;
    const beforePts = data.players.filter(p=>!p.bench).reduce((s,p)=>s+(p.predicted||0),0);
    setOriginalPlayers(data.players);
    setOriginalBank(data.bank);
    let newPlayers = [...data.players];
    let newBank = data.bank;
    results.transfers.forEach(t => {
      const outIdx = newPlayers.findIndex(p=>p.id===t.out.id);
      if (outIdx===-1) return;
      const slot = newPlayers[outIdx];
      const inPlayer = {
        ...t.in,
        short: t.in.name.split(" ").pop().slice(0,3).toUpperCase(),
        bench: slot.bench,
        captain: false,
        vice: false,
      };
      newPlayers = [...newPlayers.slice(0,outIdx), inPlayer, ...newPlayers.slice(outIdx+1)];
      newBank = Math.round((newBank-(t.in.price-t.out.price))*10)/10;
    });
    // Clear old captain/vice, then apply new recommendations
    newPlayers = newPlayers.map(p => ({...p, captain:false, vice:false}));
    if (results.captain) {
      const ci = newPlayers.findIndex(p=>p.id===results.captain.id);
      if (ci!==-1) newPlayers[ci] = {...newPlayers[ci], captain:true};
    }
    if (results.vice) {
      const vi = newPlayers.findIndex(p=>p.id===results.vice.id);
      if (vi!==-1) newPlayers[vi] = {...newPlayers[vi], vice:true};
    }
    const afterPts = newPlayers.filter(p=>!p.bench).reduce((s,p)=>s+(p.predicted||0),0);
    setData({...data, players:newPlayers, bank:newBank});
    setAppliedTransfers({
      transfers: results.transfers,
      before: Math.round(beforePts*10)/10,
      after: Math.round(afterPts*10)/10,
      gain: Math.round((afterPts-beforePts)*10)/10,
      captain: results.captain,
      vice: results.vice,
      newBank,
    });
  };

  const handleResetOptimiser = () => {
    if (originalPlayers) setData(d=>({...d, players:originalPlayers, bank:originalBank}));
    setAppliedTransfers(null);
    setOriginalPlayers(null);
    setOriginalBank(null);
  };

  const handleLoad = async () => {
    const id = teamId.trim();
    if (!id || isNaN(id)) { setError("Please enter a valid numeric Team ID."); return; }
    setError(""); setLoading(true); setAppliedTransfers(null); setOriginalPlayers(null); setOriginalBank(null);
    try {
      const [bootstrap, history] = await Promise.all([
        fetchFPL("/bootstrap-static/"),
        fetchFPL(`/entry/${id}/`),
      ]);
      bootstrapRef.current = bootstrap;
      const gw = history.current_event ||
        bootstrap.events.find(e=>e.is_current)?.id ||
        bootstrap.events.find(e=>e.is_next)?.id || 1;
      const nextGw = gw + 1;
      const teamMap = {}, playerMap = {}, teamCodeMap = {};
      bootstrap.teams.forEach(t => { teamMap[t.id] = t.short_name; teamCodeMap[t.id] = t.code; });
      bootstrap.elements.forEach(p => { playerMap[p.id] = p; });
      const [picks, fixturesRaw, nextFixturesRaw] = await Promise.all([
        fetchFPL(`/entry/${id}/event/${gw}/picks/`),
        fetchFPL(`/fixtures/?event=${gw}`),
        fetchFPL(`/fixtures/?event=${nextGw}`),
      ]);
      const bank = picks.entry_history.bank / 10;
      const fixturesByTeam = buildFixtureMap(fixturesRaw, teamMap);
      const nextFixturesByTeam = buildFixtureMap(nextFixturesRaw, teamMap);
      const posOrder = { GKP:0, DEF:1, MID:2, FWD:3 };
      const players = picks.picks.map(pick => {
        const p = playerMap[pick.element];
        const fix = fixturesByTeam[p.team]?.[0];
        const pred = fix ? predictPoints(p, fix) : 0;
        const name = p.web_name;
        return {
          id: p.id, name, short: name.split(" ").pop().slice(0,3).toUpperCase(),
          pos: POSITIONS[p.element_type], team: teamMap[p.team],
          price: p.now_cost/10, form: parseFloat(p.form)||0,
          photo: p.photo ? `https://resources.premierleague.com/premierleague/photos/players/110x140/p${p.photo.replace('.jpg','')}.png` : null,
          jersey: `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${teamCodeMap[p.team]}${p.element_type===1?'_1':''}-66.png`,
          pred, predicted: pred, ts: p.total_points,
          own: parseFloat(p.selected_by_percent),
          ppg: parseFloat(p.points_per_game)||0,
          xgi: parseFloat(p.expected_goal_involvements_per_90)||0,
          xGI90: parseFloat(p.expected_goal_involvements_per_90)||0,
          ict: parseFloat(p.ict_index)||0,
          xgc: parseFloat(p.expected_goals_conceded_per_90)||0,
          posNum: p.element_type,
          status: p.chance_of_playing_next_round!==null && p.chance_of_playing_next_round<100 ? "doubt" : "fit",
          fix: fix ? `${fix.opponent}(${fix.home?"H":"A"})` : "BLA",
          fdr: fix?.difficulty || 5,
          bench: pick.position > 11,
          captain: pick.is_captain, vice: pick.is_vice_captain,
        };
      }).sort((a,b) => a.bench!==b.bench ? (a.bench?1:-1) : posOrder[a.pos]-posOrder[b.pos]);
      // All players panel
      const squadIds = new Set(players.map(p=>p.id));
      const allPlayers = bootstrap.elements
        .filter(p => p.status==="a")
        .map(p => {
          const fix = fixturesByTeam[p.team]?.[0];
          const allPred = fix?predictPoints(p,fix):0;
          return { id:p.id, name:p.web_name, pos:POSITIONS[p.element_type], team:teamMap[p.team],
            photo: p.photo ? `https://resources.premierleague.com/premierleague/photos/players/110x140/p${p.photo.replace('.jpg','')}.png` : null,
            jersey: `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${teamCodeMap[p.team]}${p.element_type===1?'_1':''}-66.png`,
            price:p.now_cost/10, ts:p.total_points, form:parseFloat(p.form)||0,
            ppg:parseFloat(p.points_per_game)||0,
            xgi:parseFloat(p.expected_goal_involvements_per_90)||0,
            xGI90:parseFloat(p.expected_goal_involvements_per_90)||0,
            ict:parseFloat(p.ict_index)||0,
            xgc:parseFloat(p.expected_goals_conceded_per_90)||0,
            own:parseFloat(p.selected_by_percent)||0,
            posNum:p.element_type,
            fix: fix?`${fix.opponent}(${fix.home?"H":"A"})`:"BLA", fdr:fix?.difficulty||5,
            pred: allPred, predicted: allPred };
        }).sort((a,b)=>b.ts-a.ts).slice(0,100);
      // Transfer suggestions
      const starters = players.filter(p=>!p.bench);
      const usedIds = new Set(players.map(p=>p.id));
      const allSorted = [...allPlayers].sort((a,b)=>b.pred-a.pred);
      const transferSuggestions = [];
      [...starters].sort((a,b)=>{
        const aU=a.fdr===5||a.status==="doubt", bU=b.fdr===5||b.status==="doubt";
        if(aU!==bU) return aU?-1:1;
        return (a.pred||0)-(b.pred||0);
      }).slice(0,3).forEach(out => {
        const c = allSorted.find(p=>p.pos===out.pos && p.price<=out.price+bank+0.1 && !usedIds.has(p.id));
        if(c) {
          usedIds.add(c.id);
          const isDoubt = out.status==="doubt";
          transferSuggestions.push({
            out:out.name, outTeam:out.team, outPrice:out.price, outPos:out.pos,
            in:c.name, inTeam:c.team, inPrice:c.price, inPos:c.pos,
            gain:`+${(c.pred-(out.pred||0)).toFixed(1)}`,
            reason: out.fdr===5 ? `${out.name} blanks GW${gw}. ${c.name} has a ${FDR_LABELS[c.fdr]} fixture (FDR ${c.fdr}).`
              : isDoubt ? `${out.name} is a fitness doubt. ${c.name} is available with form ${c.form}.`
              : `${out.name} is underperforming (form ${out.form}). ${c.name} offers better value with form ${c.form}.`,
            conf: out.fdr===5?88:isDoubt?74:60,
          });
        }
      });
      // Captain picks
      const captainPicks = starters.filter(p=>p.fdr!==5)
        .sort((a,b)=>b.pred-a.pred).slice(0,3)
        .map((p,i)=>({ name:p.name, team:p.team, fix:p.fix, pred:p.pred, conf:[82,74,65][i], own:p.own, status:p.status, pos:p.pos, xgi:p.xgi }));
      // Chips analysis
      const benchPts = players.filter(p=>p.bench).reduce((s,p)=>s+(p.pred||0),0);
      const capPts = players.find(p=>p.captain)?.pred || 0;
      const chips = [
        { name:"Free Hit", icon:"⚡", pts:Math.round(starters.reduce((s,p)=>s+(p.pred||0),0)), rec:"Use if 3+ blanks or projected score is significantly below your average." },
        { name:"Bench Boost", icon:"📈", pts:Math.round(benchPts), rec:`Your bench projects ${Math.round(benchPts)} pts. ${benchPts>=20?"Strong candidate to activate.":"Save for a better week."}` },
        { name:"Triple Captain", icon:"👑", pts:capPts, rec:`Captain projects ${capPts} pts. ${capPts>=12?"Consider activating.":"Save for a premium blank GW."}` },
      ];
      // Next GW fixtures
      const fixtures = nextFixturesRaw.slice(0,10).map(f=>({
        time: new Date(f.kickoff_time).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",hour12:false}).replace(",",""),
        home: bootstrap.teams.find(t=>t.id===f.team_h)?.name||"?",
        away: bootstrap.teams.find(t=>t.id===f.team_a)?.name||"?",
        fdr: f.team_h_difficulty,
        fdrA: f.team_a_difficulty,
      }));
      const nextEvent = bootstrap.events.find(e=>e.id===nextGw);
      setData({
        gw, nextGw,
        countdown: nextEvent ? formatCountdown(nextEvent.deadline_time) : "TBC",
        manager: `${history.player_first_name} ${history.player_last_name}`,
        entryId: history.id,
        leagues: history.leagues,
        teamName: history.name,
        rank: history.summary_overall_rank,
        bank, teamValue: picks.entry_history.value/10,
        players, allPlayers, transferSuggestions, captainPicks, chips, fixtures,
      });
      setLoaded(true);
      // Persist team ID to Clerk user metadata
      if (user) user.update({ unsafeMetadata: { fplTeamId: id } }).catch(()=>{});
    } catch(e) {
      console.error(e);
      setError("Couldn't load your team. Check your Team ID and try again.");
    }
    setLoading(false);
  };

  const blanks = (data?.players||[]).filter(p=>!p.bench&&p.fdr===5);

  if(!loaded) return (
    <div style={{minHeight:"100vh",background:C.nav,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Inter:wght@400;500;600&display=swap'); *{box-sizing:border-box;margin:0;padding:0} @keyframes spin{to{transform:rotate(360deg)}} @keyframes glow{0%,100%{box-shadow:0 0 20px ${C.accentGlow}}50%{box-shadow:0 0 30px ${C.accent}88}}`}</style>
      <div style={{width:"100%",maxWidth:420,padding:"0 24px"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:2,marginBottom:16}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:52,fontWeight:800,lineHeight:1}}>
              <span style={{color:C.text}}>p</span><span style={{color:C.accent}}>FPL!</span>
            </div>
            <div style={{fontSize:9,color:C.muted,letterSpacing:".22em",fontWeight:600,textTransform:"uppercase"}}>predictive fantasy football</div>
          </div>
          <p style={{fontSize:13,color:C.secondary,lineHeight:1.7}}>Full-page dashboard · AI transfers · Live FPL data</p>
        </div>
        <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:14,padding:24}}>
          <div style={{fontSize:10,color:C.muted,letterSpacing:".12em",fontWeight:600,marginBottom:8}}>YOUR FPL TEAM ID</div>
          <input value={teamId} onChange={e=>setTeamId(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLoad()} placeholder="e.g. 1234567" style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 14px",fontSize:16,color:C.text,fontFamily:"'Inter',sans-serif",marginBottom:8}}/>
          <div style={{fontSize:10,color:C.muted,marginBottom:16}}>fantasy.premierleague.com/entry/<strong style={{color:C.secondary}}>ID</strong>/event</div>
          {error&&<div style={{background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:6,padding:"8px 12px",fontSize:11,color:C.red,marginBottom:12}}>{error}</div>}
          <button onClick={handleLoad} disabled={loading} style={{width:"100%",background:loading?C.border:C.accent,color:"#F0EEE8",borderRadius:20,padding:13,fontSize:14,fontWeight:800,fontFamily:"'Syne',sans-serif",letterSpacing:".1em",border:"none",cursor:"pointer",animation:loading?"none":"glow 2s ease infinite"}}>
            {loading?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span style={{width:14,height:14,border:`2px solid ${C.muted}`,borderTopColor:C.accent,borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite"}}/> LOADING...</span>:"LOAD MY TEAM →"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Inter',sans-serif",color:C.text,display:"flex",flexDirection:"column",fontSize:13}}>
      {showOptimModal&&<OptimiserModal onClose={()=>setShowOptimModal(false)} onApply={handleApplyOptimiser} squad={data.players} allPlayers={data.allPlayers} bank={data.bank}/>}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 18px ${C.accentGlow}}50%{box-shadow:0 0 28px ${C.accent}88}}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:${C.nav}}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
        button{font-family:'Inter',sans-serif}input,select{font-family:'Inter',sans-serif}
        select{outline:none}
        option{background:${C.panel}}
      `}</style>

      {/* Top bar */}
      <div style={{background:C.nav,borderBottom:`1px solid ${C.border}`,height:56,padding:"0 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,minWidth:140}}>
          <div>
            <div style={{display:"flex",alignItems:"baseline",gap:0}}>
              <span style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,color:"#F0EEE8"}}>p</span>
              <span style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,color:C.accentNav}}>FPL!</span>
            </div>
            <div style={{fontSize:7.5,color:"#7A7A72",letterSpacing:".22em",fontWeight:600,fontVariant:"small-caps",textAlign:"center",marginTop:-1}}>predictive fantasy football</div>
          </div>
          <div style={{height:28,width:1,background:"#444",marginBottom:0}}/>
          <div style={{fontSize:11,color:"#7A7A72"}}>
            <span style={{color:"#D0CEC8",fontWeight:600}}>{data.teamName}</span> <span style={{color:"#7A7A72",fontWeight:400}}>· {data.manager}</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:20,minWidth:140,justifyContent:"flex-end"}}>
          {blanks.length>0&&(
            <div style={{background:C.blankBg,border:`1px solid #DDB882`,borderRadius:10,padding:"5px 10px",fontSize:11,color:C.amber,fontWeight:700}}>
              ⚠ {blanks.length} blank{blanks.length>1?"s":""} GW{data.gw}
            </div>
          )}
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,fontWeight:600,color:"#7A7A72"}}>GW{data.nextGw} Countdown</div>
            <div style={{fontSize:11,color:C.accentNav,fontWeight:700}}>{data.countdown}</div>
          </div>
          <button onClick={()=>{ signOut(()=>navigate('/')); setLoaded(false); setData(null); }} style={{background:"transparent",border:`1px solid #555`,borderRadius:20,padding:"6px 14px",fontSize:11,fontWeight:600,color:"#9A9890",cursor:"pointer",letterSpacing:".04em"}}>SIGN OUT</button>
        </div>
      </div>

      {/* Nav */}
      <Nav activeSection={section} setSection={setSection}/>

      {/* Hero banner */}
      <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,padding:"14px 24px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:20,fontWeight:700,color:C.text,lineHeight:1,letterSpacing:"-.01em"}}>{section}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:3}}>Use AI to optimise your squad and maximise points every gameweek.</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowOptimModal(true)} style={{background:"#2C2C2A",color:"#F0EEE8",border:"none",borderRadius:20,padding:"9px 18px",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:".04em",fontFamily:"'Syne',sans-serif"}}>QUICK OPTIMISE</button>
          </div>
        </div>
        {/* Summary stats ribbon */}
        <div style={{display:"flex",marginTop:14,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
          {[
            ["BANK","£"+data.bank+"m",C.green],
            ["PROJECTED PTS",data.players?.filter(p=>!p.bench).reduce((s,p)=>s+(p.predicted||0),0)||"–",C.accent],
            ["OVERALL RANK","#"+data.rank?.toLocaleString(),C.amber],
            ["TEAM VALUE","£"+data.teamValue+"m",C.text],
            ["GW TRANSFERS","1 FREE",C.purple],
            ...(blanks.length>0?[["BLANKS",blanks.length+" BLANK",C.red]]:[]),
          ].map(([l,v,col],i,arr)=>(
            <div key={l} style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center",paddingRight:20,marginRight:20,borderRight:i<arr.length-1?`1px solid ${C.border}`:"none"}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:".12em",fontWeight:700,textAlign:"center"}}>{l}</div>
              <div style={{fontFamily:"'Inter',sans-serif",fontSize:16,fontWeight:700,color:col,lineHeight:1,textAlign:"center",fontVariantNumeric:"tabular-nums"}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Full-width Leagues & Cups view */}
      {section === "Leagues & Cups" && (
        <div style={{flex:1,overflow:"hidden",minHeight:0}}>
          <LeaguesPanel
            teamId={parseInt(teamId)}
            leagues={data.leagues}
            myEntryId={data.entryId}
            currentGw={data.gw}
          />
        </div>
      )}

      {/* Full-width GW Planner */}
      {section === "GW Planner" && (
        <div style={{flex:1,overflow:"hidden",minHeight:0}}>
          <MultiGwAnalyser
            players={data.players}
            allPlayers={data.allPlayers}
            bank={data.bank}
            currentGw={data.gw}
            bootstrapRef={bootstrapRef}
          />
        </div>
      )}

      {/* 3-col layout */}
      {section !== "Leagues & Cups" && section !== "GW Planner" && <div style={{flex:1,display:"grid",gridTemplateColumns:"360px 1fr 360px",overflow:"hidden",minHeight:0}}>

        {/* Left — player list */}
        <div style={{background:C.panel,borderRight:`1px solid ${C.border}`,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`,fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".12em"}}>ALL PLAYERS</div>
          <PlayerListPanel allPlayers={data.allPlayers} filterPos={filterPos} setFilterPos={setFilterPos} sortBy={sortBy} setSortBy={setSortBy} searchQ={searchQ} setSearchQ={setSearchQ}/>
        </div>

        {/* Centre — pitch */}
        <div style={{overflow:"auto",padding:"20px"}}>

          {/* ── Optimiser Applied Banner ── */}
          {appliedTransfers&&(
            <div style={{marginBottom:16,background:C.panel,border:`1px solid ${C.green}55`,borderRadius:12,padding:"14px 16px",animation:"fadeUp .3s ease"}}>
              {/* Header row */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:C.greenDim,border:`1px solid ${C.green}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>✓</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:C.text}}>Optimiser Applied</div>
                    <div style={{fontSize:10,color:C.muted}}>Pitch updated · click Reset to undo</div>
                  </div>
                </div>
                <button onClick={handleResetOptimiser} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 10px",fontSize:10,fontWeight:700,color:C.muted,cursor:"pointer",letterSpacing:".06em"}}>RESET ↺</button>
              </div>

              {/* Before → After pts */}
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,padding:"10px 12px",background:C.bg,borderRadius:8,border:`1px solid ${C.border}`}}>
                <div style={{textAlign:"center",flex:1}}>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:".1em",fontWeight:700,marginBottom:2}}>BEFORE</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:900,color:C.muted,lineHeight:1,textDecoration:"line-through"}}>{appliedTransfers.before}</div>
                  <div style={{fontSize:9,color:C.muted}}>pred pts</div>
                </div>
                <div style={{fontSize:20,color:C.dim}}>→</div>
                <div style={{textAlign:"center",flex:1}}>
                  <div style={{fontSize:9,color:C.green,letterSpacing:".1em",fontWeight:700,marginBottom:2}}>AFTER</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:900,color:C.green,lineHeight:1}}>{appliedTransfers.after}</div>
                  <div style={{fontSize:9,color:C.muted}}>pred pts</div>
                </div>
                <div style={{textAlign:"center",flex:1,padding:"8px",background:C.greenDim,borderRadius:6,border:`1px solid ${C.green}33`}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:900,color:C.green,lineHeight:1}}>+{appliedTransfers.gain}</div>
                  <div style={{fontSize:9,color:C.green,fontWeight:700}}>pts gain</div>
                </div>
              </div>

              {/* Transfer pairs */}
              <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:appliedTransfers.captain?10:0}}>
                {appliedTransfers.transfers.map((t,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:C.surface,borderRadius:7,border:`1px solid ${C.border}`}}>
                    <AvatarCircle name={t.out.name} pos={t.out.pos} size={28}/>
                    <div style={{flex:1,minWidth:0}}>
                      <span style={{fontSize:11,fontWeight:700,color:C.red}}>{t.out.name}</span>
                      <span style={{fontSize:10,color:C.muted}}> · {t.out.pred||t.out.predicted} pts</span>
                    </div>
                    <div style={{fontSize:14,color:C.dim}}>→</div>
                    <AvatarCircle name={t.in.name} pos={t.in.pos} size={28}/>
                    <div style={{flex:1,minWidth:0}}>
                      <span style={{fontSize:11,fontWeight:700,color:C.green}}>{t.in.name}</span>
                      <span style={{fontSize:10,color:C.muted}}> · {t.in.pred||t.in.predicted} pts</span>
                    </div>
                    <Pill color="green" small>+{((t.in.predicted||0)-(t.out.predicted||0)).toFixed(1)}</Pill>
                  </div>
                ))}
              </div>

              {/* Captain & Vice recommendation */}
              {(appliedTransfers.captain||appliedTransfers.vice)&&(
                <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:6}}>
                  {appliedTransfers.captain&&(
                    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:C.accentDim,borderRadius:7,border:`1px solid ${C.accent}33`}}>
                      <div style={{position:"relative"}}>
                        <AvatarCircle name={appliedTransfers.captain.name} pos={appliedTransfers.captain.pos} size={28}/>
                        <div style={{position:"absolute",bottom:-2,right:-2,width:12,height:12,borderRadius:"50%",background:"#3D5BD4",color:"#fff",fontSize:7,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>C</div>
                      </div>
                      <div style={{flex:1}}>
                        <span style={{fontSize:11,fontWeight:700,color:C.accent}}>Captain: {appliedTransfers.captain.name}</span>
                        <span style={{fontSize:10,color:C.muted}}> · {(appliedTransfers.captain.predicted||0)*2} pts (2×)</span>
                      </div>
                    </div>
                  )}
                  {appliedTransfers.vice&&(
                    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:C.greenDim,borderRadius:7,border:`1px solid ${C.green}33`}}>
                      <div style={{position:"relative"}}>
                        <AvatarCircle name={appliedTransfers.vice.name} pos={appliedTransfers.vice.pos} size={28}/>
                        <div style={{position:"absolute",bottom:-2,right:-2,width:12,height:12,borderRadius:"50%",background:"#3A8A5A",color:"#fff",fontSize:7,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>V</div>
                      </div>
                      <div style={{flex:1}}>
                        <span style={{fontSize:11,fontWeight:700,color:C.green}}>Vice: {appliedTransfers.vice.name}</span>
                        <span style={{fontSize:10,color:C.muted}}> · {appliedTransfers.vice.predicted||0} pts</span>
                      </div>
                      <div style={{fontSize:10,color:C.muted}}>Bank: <span style={{color:appliedTransfers.newBank>=0?C.green:C.red,fontWeight:700}}>£{appliedTransfers.newBank}m</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{display:"flex",justifyContent:"center"}}>
            <div style={{maxWidth:680,width:"100%"}}>
              <Pitch players={data.players} onPlayerClick={setSelectedPlayer} selectedId={selectedPlayer?.id}/>
            </div>
          </div>

          {/* Selected player detail */}
          {selectedPlayer&&(
            <div style={{marginTop:16,background:C.panel,border:`1px solid ${C.accent}`,borderRadius:10,padding:"14px 16px",animation:"fadeUp .25s ease"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <AvatarCircle name={selectedPlayer.name} pos={selectedPlayer.pos} size={44}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:900,color:C.text,lineHeight:1}}>{selectedPlayer.name}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:2}}>{selectedPlayer.team} · £{selectedPlayer.price}m · {selectedPlayer.own}% owned</div>
                </div>
                <div style={{display:"flex",gap:12}}>
                  {[["PRED",selectedPlayer.pred,C.accent],["xGI/90",(selectedPlayer.xgi||0).toFixed(2),C.green],["ICT",Math.round(selectedPlayer.ict||0),C.amber],["FORM",selectedPlayer.form,C.text]].map(([l,v,col])=>(
                    <div key={l} style={{textAlign:"center"}}>
                      <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:900,color:col,lineHeight:1}}>{v}</div>
                      <div style={{fontSize:8,color:C.muted,letterSpacing:".08em"}}>{l}</div>
                    </div>
                  ))}
                </div>
                <button onClick={()=>setSelectedPlayer(null)} style={{background:"transparent",color:C.muted,border:"none",fontSize:18,cursor:"pointer",padding:"4px 8px"}}>×</button>
              </div>
              <div style={{marginTop:10}}>
                <XGBar val={selectedPlayer.xgi||0}                  max={1.0} color={C.green}  label="xGI/90"/>
                <XGBar val={Math.min((selectedPlayer.ict||0)/200,1)} max={1.0} color={C.accent} label="ICT (norm)"/>
                <XGBar val={Math.min(selectedPlayer.form/10,1)}      max={1.0} color={C.amber}  label="Form"/>
              </div>
            </div>
          )}
        </div>

        {/* Right — recommendations */}
        <div style={{background:C.panel,borderLeft:`1px solid ${C.border}`,overflow:"auto"}}>
          <RightPanel section={section} data={data} selectedPlayer={selectedPlayer}/>
        </div>
      </div>}
    </div>
  );
}
