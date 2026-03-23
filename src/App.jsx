import { useState, useEffect } from "react";

// ── Tokens ────────────────────────────────────────────────────────────────────
const C = {
  bg:"#07090F", nav:"#0B0F1A", surface:"#0F1520", card:"#131D2B",
  border:"#1A2840", borderHi:"#243650",
  accent:"#00D4FF", accentDim:"#00D4FF15", accentGlow:"#00D4FF30",
  green:"#00E676", greenDim:"#00E67615",
  amber:"#FFB300", amberDim:"#FFB30015",
  red:"#FF4057", redDim:"#FF405715",
  purple:"#A855F7", purpleDim:"#A855F715",
  text:"#EDF2FF", muted:"#4A6A8A", dim:"#1E3048",
  pitch:"#1A5C2A", pitchLine:"#ffffff18", pitchMid:"#1E6830",
};

const POS_COLOR = { GKP:"#FFB300", DEF:"#00C853", MID:"#2979FF", FWD:"#FF4057" };
const FDR_COLOR = ["","#00E676","#8BC34A","#FFB300","#FF7043","#FF4057"];

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
function LoginScreen({ onAuth }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err,  setErr]  = useState("");
  const attempt = () => {
    if (user.trim() === (import.meta.env.VITE_ADMIN_USER||"").trim() &&
        pass       === (import.meta.env.VITE_ADMIN_PASS||"").trim()) {
      sessionStorage.setItem("pfpl_auth","1"); onAuth();
    } else { setErr("Incorrect username or password."); setPass(""); }
  };
  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=DM+Sans:wght@400;600&display=swap'); *{box-sizing:border-box;margin:0;padding:0} @keyframes glow{0%,100%{box-shadow:0 0 20px ${C.accentGlow}}50%{box-shadow:0 0 40px ${C.accent}55}} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} input,button{font-family:inherit;outline:none;border:none;cursor:pointer}`}</style>
      <div style={{width:"100%",maxWidth:360,padding:"0 24px",animation:"fadeUp .5s ease"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:2,marginBottom:8}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:52,fontWeight:900,lineHeight:1}}>
              <span style={{color:C.text}}>p</span><span style={{color:C.accent}}>FPL!</span>
            </div>
            <div style={{fontSize:8,color:C.muted,letterSpacing:".22em",fontWeight:600,textTransform:"uppercase"}}>predictive fantasy football</div>
          </div>
          <p style={{fontSize:12,color:C.muted,letterSpacing:".1em"}}>SIGN IN TO CONTINUE</p>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24}}>
          <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".12em",marginBottom:6}}>USERNAME</div>
          <input value={user} onChange={e=>setUser(e.target.value)} onKeyDown={e=>e.key==="Enter"&&attempt()} autoComplete="username" style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"11px 14px",fontSize:15,color:C.text,marginBottom:14}}/>
          <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".12em",marginBottom:6}}>PASSWORD</div>
          <input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&attempt()} autoComplete="current-password" style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"11px 14px",fontSize:15,color:C.text,marginBottom:err?12:20}}/>
          {err&&<div style={{background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:6,padding:"8px 12px",fontSize:11,color:C.red,marginBottom:14}}>{err}</div>}
          <button onClick={attempt} style={{width:"100%",background:C.accent,color:C.bg,borderRadius:8,padding:14,fontSize:14,fontWeight:900,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:".1em",animation:"glow 2.5s ease infinite"}}>SIGN IN →</button>
        </div>
      </div>
    </div>
  );
}

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
    <div style={{width:size,height:size,borderRadius:"50%",background:col+"22",border:`2px solid ${col}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size/3.5,fontWeight:800,color:col,flexShrink:0,fontFamily:"'Barlow Condensed',sans-serif"}}>
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
              border:`2.5px solid ${isSelected?C.accent:blank?"#FF405799":POS_COLOR[p.pos]+"88"}`,
              position:"relative",zIndex:1,background:"#0a1a0a",display:"block"}}
          />
        ):(
          <div style={{width:46,height:46,borderRadius:"50%",
            background:`linear-gradient(135deg,${POS_COLOR[p.pos]}44,${POS_COLOR[p.pos]}11)`,
            border:`2.5px solid ${isSelected?C.accent:blank?"#FF405799":POS_COLOR[p.pos]+"66"}`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:11,fontWeight:900,color:POS_COLOR[p.pos],
            fontFamily:"'Barlow Condensed',sans-serif",position:"relative",zIndex:1}}>
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
        {p.captain&&<div style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:C.accent,color:C.bg,fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",zIndex:3,boxShadow:`0 0 6px ${C.accent}`}}>C</div>}
        {!p.captain&&p.vice&&<div style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:C.green,color:C.bg,fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",zIndex:3}}>V</div>}

        {/* Blank GW label */}
        {blank&&<div style={{position:"absolute",bottom:-5,left:"50%",transform:"translateX(-50%)",background:C.red,borderRadius:3,padding:"1px 4px",fontSize:6,fontWeight:900,color:"#fff",whiteSpace:"nowrap",zIndex:3,letterSpacing:".06em"}}>BLANK</div>}

        {/* Doubt ? badge */}
        {p.status==="doubt"&&<div style={{position:"absolute",top:-4,left:-4,width:14,height:14,borderRadius:"50%",background:C.amber,color:C.bg,fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",zIndex:3}}>?</div>}
      </div>

      {/* Name chip */}
      <div style={{background:isSelected?C.accent:blank?"#FF405799":"#000000cc",color:isSelected?C.bg:C.text,
        borderRadius:3,padding:"2px 6px",fontSize:9,fontWeight:700,
        whiteSpace:"nowrap",maxWidth:72,overflow:"hidden",textOverflow:"ellipsis",textAlign:"center"}}>
        {p.short||p.name}
      </div>

      {/* Prediction */}
      <div style={{background:blank?"#FF405733":"#00000099",borderRadius:2,padding:"1px 5px",
        fontSize:9,color:blank?C.red:C.accent,fontWeight:800}}>
        {blank?"–":(p.predicted||p.pred||0)}
      </div>

      {/* Fixture */}
      <div style={{display:"flex",alignItems:"center",gap:3}}>
        <span style={{width:5,height:5,borderRadius:"50%",background:FDR_COLOR[p.fdr]||C.muted,display:"inline-block",flexShrink:0}}/>
        <span style={{fontSize:8,color:blank?"#FF405799":C.muted}}>{p.fix}</span>
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

  return (
    <div style={{
      background:"linear-gradient(180deg,#1e7a30 0%,#1a6b27 12%,#1e7a30 25%,#1a6b27 37%,#1e7a30 50%,#1a6b27 62%,#1e7a30 75%,#1a6b27 87%,#1e7a30 100%)",
      borderRadius:12,padding:"18px 8px 14px",position:"relative",overflow:"hidden",
      border:"1px solid rgba(255,255,255,0.12)",
      boxShadow:"inset 0 2px 24px rgba(0,0,0,0.4), 0 4px 32px rgba(0,0,0,0.6)"
    }}>

      {/* SVG pitch markings */}
      <svg style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none"}} preserveAspectRatio="none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Outer boundary */}
        <rect x="3" y="2" width="94" height="96" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.5" rx="0.5"/>
        {/* Halfway line */}
        <line x1="3" y1="50" x2="97" y2="50" stroke="rgba(255,255,255,0.22)" strokeWidth="0.5"/>
        {/* Centre circle */}
        <circle cx="50" cy="50" r="10" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.5"/>
        {/* Centre spot */}
        <circle cx="50" cy="50" r="0.8" fill="rgba(255,255,255,0.4)"/>
        {/* Top penalty box */}
        <rect x="22" y="2" width="56" height="17" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.5"/>
        {/* Bottom penalty box */}
        <rect x="22" y="81" width="56" height="17" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.5"/>
        {/* Top goal area (6-yard) */}
        <rect x="34" y="2" width="32" height="7" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5"/>
        {/* Bottom goal area */}
        <rect x="34" y="91" width="32" height="7" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5"/>
        {/* Top goal net */}
        <rect x="41" y="0.2" width="18" height="2.5" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.22)" strokeWidth="0.5"/>
        {/* Bottom goal net */}
        <rect x="41" y="97.3" width="18" height="2.5" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.22)" strokeWidth="0.5"/>
        {/* Penalty spots */}
        <circle cx="50" cy="13" r="0.7" fill="rgba(255,255,255,0.35)"/>
        <circle cx="50" cy="87" r="0.7" fill="rgba(255,255,255,0.35)"/>
        {/* Penalty arc top */}
        <path d="M 38 19 A 12 12 0 0 1 62 19" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5"/>
        {/* Penalty arc bottom */}
        <path d="M 38 81 A 12 12 0 0 0 62 81" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5"/>
        {/* Corner arcs */}
        <path d="M 3 4.5 A 2.5 2.5 0 0 0 5.5 2" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5"/>
        <path d="M 94.5 2 A 2.5 2.5 0 0 0 97 4.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5"/>
        <path d="M 3 95.5 A 2.5 2.5 0 0 1 5.5 98" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5"/>
        <path d="M 94.5 98 A 2.5 2.5 0 0 1 97 95.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5"/>
      </svg>

      {/* Grass stripe overlay for mowing effect */}
      <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(180deg,transparent 0px,transparent 22px,rgba(0,0,0,0.06) 22px,rgba(0,0,0,0.06) 44px)",pointerEvents:"none",borderRadius:12}}/>

      {/* Player rows */}
      {rows.map((row,ri)=>(
        <div key={ri} style={{display:"flex",justifyContent:"center",gap:8,marginBottom:ri<3?22:0,position:"relative",zIndex:1}}>
          {row.map(p=><PitchPlayer key={p.id} p={p} onPlayerClick={onPlayerClick} isSelected={selectedId===p.id}/>)}
        </div>
      ))}

      {/* Bench section */}
      <div style={{borderTop:"1px dashed rgba(255,255,255,0.18)",marginTop:18,paddingTop:12,display:"flex",justifyContent:"center",gap:8,position:"relative",zIndex:1}}>
        <div style={{fontSize:8,color:"rgba(255,255,255,0.35)",letterSpacing:".14em",fontWeight:700,alignSelf:"center",marginRight:6,textTransform:"uppercase"}}>Bench</div>
        {bench.map(p=><PitchPlayer key={p.id} p={p} onPlayerClick={onPlayerClick} isSelected={selectedId===p.id}/>)}
      </div>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav({activeSection, setSection}){
  const items = ["Assistant Manager","xGI Stats","Future Planner","AI Transfers","Captain Picks","Chips","Fixtures"];
  return (
    <div style={{background:C.nav,borderBottom:`1px solid ${C.border}`,padding:"0 24px",display:"flex",alignItems:"center",gap:0,overflowX:"auto"}}>
      {items.map(item=>{
        const active = activeSection===item;
        return (
          <button key={item} onClick={()=>setSection(item)} style={{
            background:"transparent",border:"none",borderBottom:`2px solid ${active?C.accent:"transparent"}`,
            color:active?C.accent:C.muted,padding:"12px 16px",fontSize:12,fontWeight:active?700:500,
            letterSpacing:".02em",cursor:"pointer",whiteSpace:"nowrap",transition:"all .15s",
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
          {positions.map(pos=>(
            <button key={pos} onClick={()=>setFilterPos(pos)} style={{flex:1,padding:"4px 2px",borderRadius:4,fontSize:9,fontWeight:700,background:filterPos===pos?C.accent:"transparent",color:filterPos===pos?C.bg:C.muted,border:`1px solid ${filterPos===pos?C.accent:C.border}`,cursor:"pointer"}}>
              {pos}
            </button>
          ))}
        </div>
        {/* Sort */}
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:5,color:C.text,fontSize:10,padding:"5px 7px",marginBottom:5}}>
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
          style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:5,color:C.text,fontSize:10,padding:"5px 7px",outline:"none"}}/>
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
          <div key={p.id||i} style={{display:"grid",gridTemplateColumns:"1fr 30px 32px 36px 30px",gap:2,padding:"6px 10px",borderBottom:`1px solid ${C.border}22`,alignItems:"center",background:i%2===0?"transparent":C.surface+"44"}}>
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
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,background:C.accentDim}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <div style={{width:32,height:32,borderRadius:8,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🤖</div>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:C.text}}>Assistant Manager</div>
            <div style={{fontSize:10,color:C.muted}}>Powered by pFPL! AI</div>
          </div>
        </div>
      </div>

      {/* Transfer recommendations */}
      <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".12em",marginBottom:10}}>ALGORITHM TRANSFER RECOMMENDATIONS</div>
        {data.transferSuggestions.slice(0,2).map((t,i)=>(
          <div key={i} style={{background:C.surface,borderRadius:8,padding:"10px 12px",marginBottom:8,border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
              <div style={{flex:1}}>
                <div style={{fontSize:9,color:C.red,fontWeight:800,letterSpacing:".1em",marginBottom:2}}>SELL</div>
                <div style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:"'Barlow Condensed',sans-serif"}}>{t.out}</div>
                <div style={{fontSize:9,color:C.muted}}>{t.outTeam} · £{t.outPrice}m</div>
              </div>
              <div style={{color:C.dim,fontSize:16}}>→</div>
              <div style={{flex:1,textAlign:"right"}}>
                <div style={{fontSize:9,color:C.green,fontWeight:800,letterSpacing:".1em",marginBottom:2}}>BUY</div>
                <div style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:"'Barlow Condensed',sans-serif"}}>{t.in}</div>
                <div style={{fontSize:9,color:C.muted}}>{t.inTeam} · £{t.inPrice}m</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
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
        <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".12em",marginBottom:10}}>ALGORITHM CAPTAIN RECOMMENDATIONS</div>
        {data.captainPicks.slice(0,2).map((p,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,padding:"8px 10px",background:i===0?C.accentDim:C.surface,borderRadius:8,border:`1px solid ${i===0?C.accent+"44":C.border}`}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:POS_COLOR["MID"]+"22",border:`2px solid ${POS_COLOR["MID"]}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:POS_COLOR["MID"],flexShrink:0}}>
              {p.name.slice(0,2).toUpperCase()}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:"'Barlow Condensed',sans-serif"}}>{p.name}</div>
              <div style={{fontSize:10,color:C.muted}}>{p.fix}</div>
            </div>
            {i===0&&<div style={{width:8,height:8,borderRadius:"50%",background:C.accent,flexShrink:0}}/>}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{padding:"12px 14px"}}>
        <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".12em",marginBottom:10}}>SQUAD STATS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["Pred Points","51",C.accent],["Bank","£"+data.bank+"m",C.green],["Team Value","£"+data.teamValue+"m",C.text],["Overall Rank","#"+data.rank.toLocaleString(),C.amber]].map(([l,v,col])=>(
            <div key={l} style={{background:C.surface,borderRadius:7,padding:"8px 10px",border:`1px solid ${C.border}`}}>
              <div style={{fontSize:18,fontWeight:900,color:col,fontFamily:"'Barlow Condensed',sans-serif",lineHeight:1}}>{v}</div>
              <div style={{fontSize:9,color:C.muted,marginTop:3,letterSpacing:".08em"}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FixturesPanel({fixtures}){
  return (
    <div style={{padding:"14px 16px"}}>
      <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".12em",marginBottom:12}}>GAMEWEEK 32 FIXTURES</div>
      {fixtures.map((f,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",padding:"9px 10px",borderBottom:`1px solid ${C.border}33`,gap:8}}>
          <div style={{fontSize:10,color:C.muted,width:80,flexShrink:0}}>{f.time}</div>
          <div style={{flex:1,textAlign:"right",fontSize:12,fontWeight:600,color:C.text}}>{f.home}</div>
          <div style={{fontSize:10,color:C.muted,padding:"2px 8px",background:C.surface,borderRadius:4,flexShrink:0}}>vs</div>
          <div style={{flex:1,fontSize:12,fontWeight:600,color:C.text}}>{f.away}</div>
          <div style={{fontSize:12,color:C.muted}}>›</div>
        </div>
      ))}
    </div>
  );
}

function CaptainPanel({picks}){
  return (
    <div style={{padding:"14px 16px"}}>
      <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".12em",marginBottom:12}}>CAPTAIN RECOMMENDATIONS</div>
      {picks.map((p,i)=>(
        <div key={i} style={{background:i===0?`linear-gradient(135deg,${C.card},${C.accentDim})`:C.card,border:`1px solid ${i===0?C.accent+"44":C.border}`,borderRadius:10,padding:"14px",marginBottom:10,boxShadow:i===0?`0 4px 20px ${C.accentGlow}`:"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{position:"relative"}}>
              <AvatarCircle name={p.name} pos={p.pos||"MID"} size={48}/>
              {i===0&&<div style={{position:"absolute",bottom:-2,right:-2,width:18,height:18,borderRadius:"50%",background:C.accent,color:C.bg,fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>C</div>}
              {i===1&&<div style={{position:"absolute",bottom:-2,right:-2,width:18,height:18,borderRadius:"50%",background:C.green,color:C.bg,fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>V</div>}
            </div>
            <div style={{flex:1}}>
              {i===0&&<Pill color="accent" small>TOP PICK</Pill>}
              <div style={{fontSize:20,fontWeight:900,color:C.text,fontFamily:"'Barlow Condensed',sans-serif",marginTop:i===0?4:0}}>{p.name}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:2}}>{p.team} · {p.fix} · {p.own}% owned</div>
              {p.xgi!==undefined&&<XGBar val={p.xgi||0} max={1.0} color={C.green} label="xGI/90"/>}
            </div>
            <div style={{textAlign:"center",flexShrink:0}}>
              <div style={{fontSize:36,fontWeight:900,color:i===0?C.accent:C.text,fontFamily:"'Barlow Condensed',sans-serif",lineHeight:1}}>{p.pred*2}</div>
              <div style={{fontSize:9,color:C.muted}}>2× PRED</div>
              <div style={{fontSize:12,color:p.conf>=75?C.green:C.amber,fontWeight:700,marginTop:4}}>{p.conf}%</div>
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
      <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".12em",marginBottom:12}}>CHIPS ASSISTANT</div>
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
      <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".12em",marginBottom:10}}>AI TRANSFER PLANNER</div>

      {/* 1-5 selector with Wildcard / Free Hit labels */}
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",gap:4,background:C.surface,borderRadius:8,padding:4}}>
          {[1,2,3,4,5].map((n,idx)=>(
            <div key={n} style={{flex:1,textAlign:"center"}}>
              <div style={{fontSize:8,color:C.muted,marginBottom:3,whiteSpace:"nowrap",minHeight:12}}>
                {idx===0?"Wildcard":idx===4?"Free Hit":""}
              </div>
              <button onClick={()=>setCount(n)} style={{width:"100%",padding:"8px 4px",borderRadius:6,fontSize:13,fontWeight:900,fontFamily:"'Barlow Condensed',sans-serif",background:count===n?C.accent:"transparent",color:count===n?C.bg:C.muted,border:`1px solid ${count===n?C.accent:C.border}`,cursor:"pointer",transition:"all .15s"}}>
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
            <div style={{flex:1,background:C.redDim,borderRadius:7,padding:"8px 10px",border:`1px solid ${C.red}22`}}>
              <div style={{fontSize:8,color:C.red,fontWeight:800,letterSpacing:".1em",marginBottom:4}}>SELL</div>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <AvatarCircle name={t.out} pos={t.outPos||"MID"} size={30}/>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:"'Barlow Condensed',sans-serif"}}>{t.out}</div>
                  <div style={{fontSize:9,color:C.muted}}>{t.outTeam} · £{t.outPrice}m</div>
                </div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",color:C.dim,fontSize:18}}>→</div>
            <div style={{flex:1,background:C.greenDim,borderRadius:7,padding:"8px 10px",border:`1px solid ${C.green}22`}}>
              <div style={{fontSize:8,color:C.green,fontWeight:800,letterSpacing:".1em",marginBottom:4}}>BUY</div>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <AvatarCircle name={t.in} pos={t.inPos||"MID"} size={30}/>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:"'Barlow Condensed',sans-serif"}}>{t.in}</div>
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
    <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,width:"100%",maxWidth:560,maxHeight:"90vh",overflow:"auto",position:"relative"}}>
        <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:"transparent",border:"none",color:C.muted,fontSize:20,cursor:"pointer",lineHeight:1}}>×</button>

        {!results ? (
          <div style={{padding:24}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{width:48,height:48,borderRadius:"50%",background:C.accentDim,border:`1px solid ${C.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 10px"}}>⚡</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:900,color:C.text}}>Auto Squad Optimisation</div>
              <div style={{fontSize:12,color:C.muted,marginTop:4}}>AI-powered algorithm using xGI, ICT, form & fixture data</div>
            </div>

            {/* Transfer count */}
            <div style={{marginBottom:18}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:".1em",marginBottom:10}}>HOW MANY TRANSFERS?</div>
              <div style={{display:"flex",gap:4,background:C.surface,borderRadius:8,padding:4}}>
                {[1,2,3,4,5].map((n,idx)=>(
                  <div key={n} style={{flex:1,textAlign:"center"}}>
                    {idx===0&&<div style={{fontSize:8,color:C.muted,marginBottom:3,whiteSpace:"nowrap"}}>Wildcard</div>}
                    {idx>0&&idx<4&&<div style={{fontSize:8,color:"transparent",marginBottom:3}}>·</div>}
                    {idx===4&&<div style={{fontSize:8,color:C.muted,marginBottom:3,whiteSpace:"nowrap"}}>Free Hit</div>}
                    <button onClick={()=>setXferCount(n)} style={{width:"100%",padding:"8px 4px",borderRadius:6,fontSize:13,fontWeight:800,fontFamily:"'Barlow Condensed',sans-serif",background:xferCount===n?C.accent:"transparent",color:xferCount===n?C.bg:C.muted,border:`1px solid ${xferCount===n?C.accent:C.border}`,cursor:"pointer"}}>
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
                <div key={opt.id} onClick={()=>setCriteria(opt.id)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",marginBottom:6,borderRadius:8,border:`1px solid ${criteria===opt.id?C.accent:C.border}`,background:criteria===opt.id?C.accentDim:C.surface,cursor:"pointer"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:criteria===opt.id?C.accent:C.text}}>{opt.label}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:1}}>{opt.desc}</div>
                  </div>
                  <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${criteria===opt.id?C.accent:C.border}`,background:criteria===opt.id?C.accent:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {criteria===opt.id&&<div style={{width:6,height:6,borderRadius:"50%",background:C.bg}}/>}
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
                  <select value={val} onChange={e=>setter(e.target.value)} style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:12,padding:"8px 10px"}}>
                    {opts.map(o=><option key={o} value={o}>{o==="unlimited"?"Unlimited":label.includes("price")?`£${o}m`:`${o}%`}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <button onClick={runOptimiser} disabled={running} style={{width:"100%",background:running?C.border:C.accent,color:C.bg,borderRadius:8,padding:14,fontSize:14,fontWeight:900,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:".1em",border:"none",cursor:"pointer"}}>
              {running
                ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span style={{width:14,height:14,border:`2px solid ${C.muted}`,borderTopColor:C.bg,borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite"}}/>RUNNING ALGORITHM...</span>
                : "⚡ RUN OPTIMISER"}
            </button>
          </div>
        ) : (
          <div style={{padding:24}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{width:48,height:48,borderRadius:"50%",background:C.greenDim,border:`1px solid ${C.green}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 10px"}}>✓</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:900,color:C.text}}>Algorithm recommended transfers!</div>
              <div style={{fontSize:11,color:C.muted,marginTop:4}}>Review and apply to your squad view</div>
            </div>

            {results.transfers.length>0 ? (
              <>
                <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".1em",marginBottom:12}}>YOUR TRANSFERS</div>
                {results.transfers.map((t,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:16,padding:"14px 16px",background:C.surface,borderRadius:10,border:`1px solid ${C.border}`}}>
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
                <div key={i} style={{textAlign:"center",padding:"14px 20px",background:i===0?C.accentDim:C.surface,borderRadius:10,border:`1px solid ${i===0?C.accent+"44":C.border}`,flex:1}}>
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
              <button onClick={()=>setResults(null)} style={{padding:12,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:12,fontWeight:700,cursor:"pointer"}}>← Back</button>
              <button onClick={()=>{onApply&&onApply(results);onClose();}} style={{padding:12,background:C.accent,border:"none",borderRadius:8,color:C.bg,fontSize:12,fontWeight:900,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:".08em",cursor:"pointer"}}>APPLY TO SQUAD</button>
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
      <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".1em",marginBottom:10}}>xGI / ICT STATS</div>
      <div style={{display:"flex",gap:4,marginBottom:12,background:C.surface,borderRadius:7,padding:3}}>
        {[["squad","My Squad"],["all","All Players"]].map(([id,label])=>(
          <button key={id} onClick={()=>setView(id)} style={{flex:1,padding:"6px",borderRadius:5,fontSize:10,fontWeight:700,background:view===id?C.accent:"transparent",color:view===id?C.bg:C.muted,border:"none",cursor:"pointer"}}>
            {label}
          </button>
        ))}
      </div>
      {sorted.map(p=>(
        <div key={p.id} style={{marginBottom:12,padding:"10px 12px",background:C.surface,borderRadius:8,border:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <AvatarCircle name={p.name} pos={p.pos} size={28}/>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:C.text}}>{p.name}</div>
                <div style={{fontSize:9,color:C.muted}}>{p.team} · {p.fix}</div>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:16,fontWeight:900,color:C.accent,fontFamily:"'Barlow Condensed',sans-serif",lineHeight:1}}>{p.predicted}</div>
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

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [section, setSection] = useState("Assistant Manager");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [filterPos, setFilterPos] = useState("All");
  const [sortBy, setSortBy] = useState("pred");
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("pfpl_auth") === "1");
  const [teamId, setTeamId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
        captain: slot.captain,
        vice: slot.vice,
      };
      newPlayers = [...newPlayers.slice(0,outIdx), inPlayer, ...newPlayers.slice(outIdx+1)];
      newBank = Math.round((newBank-(t.in.price-t.out.price))*10)/10;
    });
    const afterPts = newPlayers.filter(p=>!p.bench).reduce((s,p)=>s+(p.predicted||0),0);
    setData({...data, players:newPlayers, bank:newBank});
    setAppliedTransfers({
      transfers: results.transfers,
      before: Math.round(beforePts*10)/10,
      after: Math.round(afterPts*10)/10,
      gain: Math.round((afterPts-beforePts)*10)/10,
      captain: results.captain,
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
      }));
      const nextEvent = bootstrap.events.find(e=>e.id===nextGw);
      setData({
        gw, nextGw,
        countdown: nextEvent ? formatCountdown(nextEvent.deadline_time) : "TBC",
        manager: `${history.player_first_name} ${history.player_last_name}`,
        teamName: history.name,
        rank: history.summary_overall_rank,
        bank, teamValue: picks.entry_history.value/10,
        players, allPlayers, transferSuggestions, captainPicks, chips, fixtures,
      });
      setLoaded(true);
    } catch(e) {
      console.error(e);
      setError("Couldn't load your team. Check your Team ID and try again.");
    }
    setLoading(false);
  };

  if (!authed) return <LoginScreen onAuth={() => setAuthed(true)} />;

  const blanks = (data?.players||[]).filter(p=>!p.bench&&p.fdr===5);

  if(!loaded) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap'); *{box-sizing:border-box;margin:0;padding:0} @keyframes spin{to{transform:rotate(360deg)}} @keyframes glow{0%,100%{box-shadow:0 0 20px #00D4FF33}50%{box-shadow:0 0 40px #00D4FF66}}`}</style>
      <div style={{width:"100%",maxWidth:420,padding:"0 24px"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:2,marginBottom:16}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:52,fontWeight:900,lineHeight:1,letterSpacing:"-0.02em"}}>
              <span style={{color:C.text}}>p</span><span style={{color:C.accent}}>FPL!</span>
            </div>
            <div style={{fontSize:9,color:C.muted,letterSpacing:".22em",fontWeight:600,textTransform:"uppercase"}}>predictive fantasy football</div>
          </div>
          <p style={{fontSize:13,color:C.muted,lineHeight:1.7}}>Full-page dashboard · AI transfers · Live FPL data</p>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24}}>
          <div style={{fontSize:10,color:C.muted,letterSpacing:".12em",fontWeight:700,marginBottom:8}}>YOUR FPL TEAM ID</div>
          <input value={teamId} onChange={e=>setTeamId(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLoad()} placeholder="e.g. 1234567" style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 14px",fontSize:16,color:C.text,fontFamily:"'DM Sans',sans-serif",marginBottom:8}}/>
          <div style={{fontSize:10,color:C.dim,marginBottom:16}}>fantasy.premierleague.com/entry/<strong style={{color:C.muted}}>ID</strong>/event</div>
          {error&&<div style={{background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:6,padding:"8px 12px",fontSize:11,color:C.red,marginBottom:12}}>{error}</div>}
          <button onClick={handleLoad} disabled={loading} style={{width:"100%",background:loading?C.border:C.accent,color:loading?C.muted:C.bg,borderRadius:8,padding:13,fontSize:14,fontWeight:900,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:".1em",border:"none",cursor:"pointer",animation:loading?"none":"glow 2s ease infinite"}}>
            {loading?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span style={{width:14,height:14,border:`2px solid ${C.muted}`,borderTopColor:C.accent,borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite"}}/> LOADING...</span>:"LOAD MY TEAM →"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif",color:C.text,display:"flex",flexDirection:"column"}}>
      {showOptimModal&&<OptimiserModal onClose={()=>setShowOptimModal(false)} onApply={handleApplyOptimiser} squad={data.players} allPlayers={data.allPlayers} bank={data.bank}/>}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
        button{font-family:'DM Sans',sans-serif}
        select{outline:none}
        option{background:${C.card}}
      `}</style>

      {/* Top bar */}
      <div style={{background:C.nav,borderBottom:`1px solid ${C.border}`,padding:"10px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"flex-end",gap:10}}>
          <div>
            <div style={{display:"flex",alignItems:"baseline",gap:0}}>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:26,fontWeight:900,color:C.text,letterSpacing:"-0.02em"}}>p</span>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:26,fontWeight:900,color:C.accent}}>FPL!</span>
            </div>
            <div style={{fontSize:8,color:C.muted,letterSpacing:".2em",fontWeight:600,textTransform:"uppercase",marginTop:-2,marginLeft:1}}>predictive fantasy football</div>
          </div>
          <div style={{height:28,width:1,background:C.border,marginBottom:4}}/>
          <div style={{fontSize:11,color:C.muted}}>
            FPL Team updated · <span style={{color:C.text,fontWeight:600}}>{data.manager}</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:24}}>
          {blanks.length>0&&(
            <div style={{background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:6,padding:"5px 10px",fontSize:11,color:C.red,fontWeight:700}}>
              ⚠ {blanks.length} blank{blanks.length>1?"s":""} GW{data.gw}
            </div>
          )}
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,fontWeight:700,color:C.text}}>GW{data.nextGw} Countdown</div>
            <div style={{fontSize:11,color:C.accent,fontWeight:700}}>{data.countdown}</div>
          </div>
          <button onClick={()=>{sessionStorage.removeItem("pfpl_auth");setAuthed(false);setLoaded(false);setData(null);}} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:7,padding:"6px 12px",fontSize:11,fontWeight:700,color:C.muted,cursor:"pointer",letterSpacing:".06em"}}>SIGN OUT</button>
        </div>
      </div>

      {/* Nav */}
      <Nav activeSection={section} setSection={setSection}/>

      {/* Hero banner */}
      <div style={{background:`linear-gradient(135deg, #0D1E35 0%, #0A1525 100%)`,borderBottom:`1px solid ${C.border}`,padding:"20px 24px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:28,fontWeight:900,color:C.text,lineHeight:1}}>{section}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:4}}>Use AI to optimise your squad and maximise points every gameweek.</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowOptimModal(true)} style={{background:C.surface,color:C.text,border:`1px solid ${C.border}`,borderRadius:7,padding:"9px 16px",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:".04em"}}>QUICK OPTIMISE</button>
            <button style={{background:C.accent,color:C.bg,border:"none",borderRadius:7,padding:"9px 16px",fontSize:12,fontWeight:800,cursor:"pointer",letterSpacing:".04em"}}>AI CUSTOMISE ⚡</button>
          </div>
        </div>
        {/* Summary stats */}
        <div style={{display:"flex",gap:24,marginTop:16}}>
          {[["BANK","£"+data.bank+"m",C.green],["PROJECTED PTS","51",C.accent],["OVERALL RANK","#"+data.rank.toLocaleString(),C.amber],["TEAM VALUE","£"+data.teamValue+"m",C.text],["GW TRANSFERS","1 FREE",C.purple]].map(([l,v,col])=>(
            <div key={l} style={{display:"flex",flexDirection:"column",gap:2}}>
              <div style={{fontSize:9,color:C.muted,letterSpacing:".12em",fontWeight:700}}>{l}</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:900,color:col,lineHeight:1}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 3-col layout */}
      <div style={{flex:1,display:"grid",gridTemplateColumns:"280px 1fr 280px",overflow:"hidden",minHeight:0}}>

        {/* Left — player list */}
        <div style={{borderRight:`1px solid ${C.border}`,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`,fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".12em"}}>ALL PLAYERS</div>
          <PlayerListPanel allPlayers={data.allPlayers} filterPos={filterPos} setFilterPos={setFilterPos} sortBy={sortBy} setSortBy={setSortBy} searchQ={searchQ} setSearchQ={setSearchQ}/>
        </div>

        {/* Centre — pitch */}
        <div style={{overflow:"auto",padding:"20px"}}>

          {/* ── Optimiser Applied Banner ── */}
          {appliedTransfers&&(
            <div style={{marginBottom:16,background:`linear-gradient(135deg,${C.card},#0D1E35)`,border:`1px solid ${C.green}44`,borderRadius:12,padding:"14px 16px",animation:"fadeUp .3s ease"}}>
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
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,padding:"10px 12px",background:C.surface,borderRadius:8,border:`1px solid ${C.border}`}}>
                <div style={{textAlign:"center",flex:1}}>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:".1em",fontWeight:700,marginBottom:2}}>BEFORE</div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:28,fontWeight:900,color:C.muted,lineHeight:1,textDecoration:"line-through"}}>{appliedTransfers.before}</div>
                  <div style={{fontSize:9,color:C.muted}}>pred pts</div>
                </div>
                <div style={{fontSize:20,color:C.dim}}>→</div>
                <div style={{textAlign:"center",flex:1}}>
                  <div style={{fontSize:9,color:C.green,letterSpacing:".1em",fontWeight:700,marginBottom:2}}>AFTER</div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:28,fontWeight:900,color:C.green,lineHeight:1}}>{appliedTransfers.after}</div>
                  <div style={{fontSize:9,color:C.muted}}>pred pts</div>
                </div>
                <div style={{textAlign:"center",flex:1,padding:"8px",background:C.greenDim,borderRadius:6,border:`1px solid ${C.green}33`}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:24,fontWeight:900,color:C.green,lineHeight:1}}>+{appliedTransfers.gain}</div>
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

              {/* Captain recommendation */}
              {appliedTransfers.captain&&(
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:C.accentDim,borderRadius:7,border:`1px solid ${C.accent}33`,marginTop:6}}>
                  <div style={{position:"relative"}}>
                    <AvatarCircle name={appliedTransfers.captain.name} pos={appliedTransfers.captain.pos} size={28}/>
                    <div style={{position:"absolute",bottom:-2,right:-2,width:12,height:12,borderRadius:"50%",background:C.accent,color:C.bg,fontSize:7,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>C</div>
                  </div>
                  <div style={{flex:1}}>
                    <span style={{fontSize:11,fontWeight:700,color:C.accent}}>Captain: {appliedTransfers.captain.name}</span>
                    <span style={{fontSize:10,color:C.muted}}> · {(appliedTransfers.captain.predicted||0)*2} pts (2×)</span>
                  </div>
                  <div style={{fontSize:10,color:C.muted}}>Bank: <span style={{color:appliedTransfers.newBank>=0?C.green:C.red,fontWeight:700}}>£{appliedTransfers.newBank}m</span></div>
                </div>
              )}
            </div>
          )}

          <Pitch players={data.players} onPlayerClick={setSelectedPlayer} selectedId={selectedPlayer?.id}/>

          {/* Selected player detail */}
          {selectedPlayer&&(
            <div style={{marginTop:16,background:C.card,border:`1px solid ${C.accent}44`,borderRadius:10,padding:"14px 16px",animation:"fadeUp .25s ease"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <AvatarCircle name={selectedPlayer.name} pos={selectedPlayer.pos} size={44}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:900,color:C.text,lineHeight:1}}>{selectedPlayer.name}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:2}}>{selectedPlayer.team} · £{selectedPlayer.price}m · {selectedPlayer.own}% owned</div>
                </div>
                <div style={{display:"flex",gap:12}}>
                  {[["PRED",selectedPlayer.pred,C.accent],["xGI/90",(selectedPlayer.xgi||0).toFixed(2),C.green],["ICT",Math.round(selectedPlayer.ict||0),C.amber],["FORM",selectedPlayer.form,C.text]].map(([l,v,col])=>(
                    <div key={l} style={{textAlign:"center"}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:900,color:col,lineHeight:1}}>{v}</div>
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
        <div style={{borderLeft:`1px solid ${C.border}`,overflow:"auto"}}>
          <RightPanel section={section} data={data} selectedPlayer={selectedPlayer}/>
        </div>
      </div>
    </div>
  );
}
