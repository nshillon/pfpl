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

function predictPoints(player, fix) {
  const form = parseFloat(player.form) || 0;
  const fdrMod = [0, 1.4, 1.2, 1.0, 0.7, 0.4][fix?.difficulty || 3];
  const pos = POSITIONS[player.element_type];
  const csBonus = (pos==="GKP"||pos==="DEF") ? 1.5 : pos==="MID" ? 0.5 : 0;
  return Math.max(1, Math.round((form * fdrMod + csBonus) * 10) / 10);
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

// ── Pitch Component ───────────────────────────────────────────────────────────
function Pitch({players, onPlayerClick, selectedId}){
  const starters = players.filter(p=>!p.bench);
  const bench    = players.filter(p=>p.bench);
  const byPos = pos => starters.filter(p=>p.pos===pos);

  const rows = [
    byPos("GKP"), byPos("DEF"), byPos("MID"), byPos("FWD")
  ];

  const PitchPlayer = ({p})=>{
    const isSelected = selectedId===p.id;
    const isBlank = p.fdr===5;
    return (
      <div onClick={()=>onPlayerClick(p)} style={{display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",gap:3,minWidth:64}}>
        {/* Shirt */}
        <div style={{position:"relative",width:44,height:44}}>
          <svg width="44" height="44" viewBox="0 0 44 44">
            <path d="M8 10 L4 18 L10 20 L10 38 L34 38 L34 20 L40 18 L36 10 L28 14 C26 8 18 8 16 14 Z"
              fill={POS_COLOR[p.pos]+"cc"} stroke={isSelected?C.accent:POS_COLOR[p.pos]+"66"} strokeWidth={isSelected?2:1}/>
          </svg>
          {p.captain&&<div style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:C.accent,color:C.bg,fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>C</div>}
          {p.vice&&<div style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:C.green,color:C.bg,fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>V</div>}
          {isBlank&&<div style={{position:"absolute",bottom:-4,left:"50%",transform:"translateX(-50%)",background:C.red,borderRadius:2,padding:"0 3px",fontSize:7,fontWeight:800,color:"#fff",whiteSpace:"nowrap"}}>BLA</div>}
          {p.status==="doubt"&&<div style={{position:"absolute",top:-4,left:-4,width:14,height:14,borderRadius:"50%",background:C.amber,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8}}>?</div>}
        </div>
        {/* Name tag */}
        <div style={{background:isSelected?C.accent:isBlank?"#FF405799":"#000000cc",color:isSelected?C.bg:C.text,borderRadius:3,padding:"2px 6px",fontSize:10,fontWeight:700,whiteSpace:"nowrap",maxWidth:72,overflow:"hidden",textOverflow:"ellipsis",textAlign:"center"}}>
          {p.short}
        </div>
        <div style={{background:isBlank?"#FF405733":"#00000088",borderRadius:2,padding:"1px 5px",fontSize:9,color:isBlank?C.red:C.accent,fontWeight:700}}>
          {isBlank?"–":p.pred}
        </div>
        <FdrBadge fix={p.fix} fdr={p.fdr}/>
      </div>
    );
  };

  return (
    <div style={{background:`linear-gradient(180deg, ${C.pitchMid} 0%, ${C.pitch} 40%, ${C.pitchMid} 100%)`,borderRadius:10,padding:"16px 8px",position:"relative",overflow:"hidden",border:`1px solid #ffffff18`}}>
      {/* Pitch markings */}
      <svg style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none"}} preserveAspectRatio="none">
        <rect x="5%" y="5%" width="90%" height="90%" fill="none" stroke={C.pitchLine} strokeWidth="1"/>
        <line x1="5%" y1="50%" x2="95%" y2="50%" stroke={C.pitchLine} strokeWidth="1"/>
        <circle cx="50%" cy="50%" r="10%" fill="none" stroke={C.pitchLine} strokeWidth="1"/>
        <rect x="25%" y="5%" width="50%" height="16%" fill="none" stroke={C.pitchLine} strokeWidth="1"/>
        <rect x="25%" y="79%" width="50%" height="16%" fill="none" stroke={C.pitchLine} strokeWidth="1"/>
        <rect x="35%" y="5%" width="30%" height="8%" fill="none" stroke={C.pitchLine} strokeWidth="1"/>
        <rect x="35%" y="87%" width="30%" height="8%" fill="none" stroke={C.pitchLine} strokeWidth="1"/>
      </svg>

      {/* Starting rows */}
      {rows.map((row,ri)=>(
        <div key={ri} style={{display:"flex",justifyContent:"center",gap:8,marginBottom:ri<3?20:0,position:"relative",zIndex:1}}>
          {row.map(p=><PitchPlayer key={p.id} p={p}/>)}
        </div>
      ))}

      {/* Bench */}
      <div style={{borderTop:`1px dashed ${C.pitchLine}`,marginTop:16,paddingTop:12,display:"flex",justifyContent:"center",gap:8}}>
        <div style={{fontSize:9,color:"#ffffff44",letterSpacing:".12em",fontWeight:700,alignSelf:"center",marginRight:8}}>BENCH</div>
        {bench.map(p=><PitchPlayer key={p.id} p={p}/>)}
      </div>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav({activeSection, setSection}){
  const items = ["Assistant Manager","Future Planner","AI Transfers","Captain Picks","Chips","Fixtures"];
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
function PlayerListPanel({allPlayers, filterPos, setFilterPos, sortBy, setSortBy}){
  const positions = ["All","GKP","DEF","MID","FWD"];
  const filtered = allPlayers
    .filter(p=>filterPos==="All"||p.pos===filterPos)
    .sort((a,b)=>b[sortBy]-a[sortBy]);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {/* Filters */}
      <div style={{padding:"10px 12px",borderBottom:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:8}}>
        <div style={{display:"flex",gap:4}}>
          {positions.map(pos=>(
            <button key={pos} onClick={()=>setFilterPos(pos)} style={{flex:1,padding:"5px 2px",borderRadius:5,fontSize:10,fontWeight:700,background:filterPos===pos?C.accent:"transparent",color:filterPos===pos?C.bg:C.muted,border:`1px solid ${filterPos===pos?C.accent:C.border}`,cursor:"pointer"}}>
              {pos}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:5,color:C.text,fontSize:11,padding:"5px 8px",width:"100%"}}>
          <option value="ts">Sorted by Total Score</option>
          <option value="form">Sorted by Form</option>
          <option value="price">Sorted by Price</option>
        </select>
      </div>

      {/* Column headers */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 40px 40px 36px",gap:4,padding:"6px 12px",borderBottom:`1px solid ${C.border}`}}>
        {["Player","£","TS","FDR"].map(h=><div key={h} style={{fontSize:9,color:C.muted,fontWeight:700,letterSpacing:".1em",textAlign:h==="Player"?"left":"right"}}>{h}</div>)}
      </div>

      {/* Player rows */}
      <div style={{flex:1,overflowY:"auto"}}>
        {filtered.map((p,i)=>(
          <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 40px 40px 36px",gap:4,padding:"7px 12px",borderBottom:`1px solid ${C.border}33`,alignItems:"center",":hover":{background:C.surface}}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:1}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:POS_COLOR[p.pos],flexShrink:0,display:"inline-block"}}/>
                <span style={{fontSize:12,fontWeight:600,color:C.text}}>{p.name}</span>
              </div>
              <FdrBadge fix={p.fix} fdr={p.fdr}/>
            </div>
            <div style={{fontSize:11,color:C.muted,textAlign:"right"}}>£{p.price}</div>
            <div style={{fontSize:12,fontWeight:700,color:C.text,textAlign:"right"}}>{p.ts}</div>
            <div style={{textAlign:"right"}}>
              <span style={{display:"inline-block",width:22,height:22,borderRadius:4,background:FDR_COLOR[p.fdr]+"33",color:FDR_COLOR[p.fdr]||C.muted,fontSize:10,fontWeight:800,lineHeight:"22px",textAlign:"center"}}>{p.fdr}</span>
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
  if(section==="AI Transfers") return <AITransfersPanel transfers={data.transferSuggestions}/>;

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
            <div style={{flex:1}}>
              {i===0&&<Pill color="accent" small>TOP PICK</Pill>}
              <div style={{fontSize:20,fontWeight:900,color:C.text,fontFamily:"'Barlow Condensed',sans-serif",marginTop:4}}>{p.name}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>{p.team} · {p.fix}</div>
              <div style={{fontSize:11,color:C.muted}}>Owned: {p.own}%</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:36,fontWeight:900,color:i===0?C.accent:C.text,fontFamily:"'Barlow Condensed',sans-serif",lineHeight:1}}>{p.pred*2}</div>
              <div style={{fontSize:9,color:C.muted}}>2× PRED</div>
              <div style={{fontSize:12,color:p.conf>=75?C.green:C.amber,fontWeight:700,marginTop:4}}>{p.conf}%</div>
            </div>
          </div>
          <div style={{marginTop:10,height:3,background:C.border,borderRadius:2}}>
            <div style={{width:p.conf+"%",height:"100%",background:i===0?C.accent:C.green,borderRadius:2}}/>
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

function AITransfersPanel({transfers}){
  const [count, setCount] = useState(1);
  const list = transfers.slice(0, count);
  return (
    <div style={{padding:"14px 16px"}}>
      <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:".12em",marginBottom:10}}>AI TRANSFER PLANNER</div>
      <div style={{display:"flex",gap:4,marginBottom:14}}>
        {[1,2,3].map(n=>(
          <button key={n} onClick={()=>setCount(n)} style={{flex:1,padding:"7px",borderRadius:6,fontSize:12,fontWeight:800,fontFamily:"'Barlow Condensed',sans-serif",background:count===n?C.accent:"transparent",color:count===n?C.bg:C.muted,border:`1px solid ${count===n?C.accent:C.border}`,cursor:"pointer"}}>
            {n} {n===1?"XFER":"XFERS"}
          </button>
        ))}
      </div>
      {list.map((t,i)=>(
        <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px",marginBottom:10}}>
          <div style={{fontSize:9,color:C.muted,letterSpacing:".1em",fontWeight:700,marginBottom:8}}>TRANSFER {i+1} OF {count}</div>
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            <div style={{flex:1,background:C.redDim,borderRadius:7,padding:"8px 10px",border:`1px solid ${C.red}22`}}>
              <div style={{fontSize:8,color:C.red,fontWeight:800,letterSpacing:".1em",marginBottom:3}}>SELL</div>
              <div style={{fontSize:14,fontWeight:800,color:C.text,fontFamily:"'Barlow Condensed',sans-serif"}}>{t.out}</div>
              <div style={{fontSize:9,color:C.muted}}>{t.outTeam} · £{t.outPrice}m</div>
            </div>
            <div style={{display:"flex",alignItems:"center",color:C.dim,fontSize:18}}>→</div>
            <div style={{flex:1,background:C.greenDim,borderRadius:7,padding:"8px 10px",border:`1px solid ${C.green}22`}}>
              <div style={{fontSize:8,color:C.green,fontWeight:800,letterSpacing:".1em",marginBottom:3}}>BUY</div>
              <div style={{fontSize:14,fontWeight:800,color:C.text,fontFamily:"'Barlow Condensed',sans-serif"}}>{t.in}</div>
              <div style={{fontSize:9,color:C.muted}}>{t.inTeam} · £{t.inPrice}m</div>
            </div>
          </div>
          <div style={{fontSize:10,color:C.muted,lineHeight:1.5,marginBottom:8}}>{t.reason}</div>
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
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [section, setSection] = useState("Assistant Manager");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [filterPos, setFilterPos] = useState("All");
  const [sortBy, setSortBy] = useState("ts");
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("pfpl_auth") === "1");
  const [teamId, setTeamId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const handleLoad = async () => {
    const id = teamId.trim();
    if (!id || isNaN(id)) { setError("Please enter a valid numeric Team ID."); return; }
    setError(""); setLoading(true);
    try {
      const [bootstrap, history] = await Promise.all([
        fetchFPL("/bootstrap-static/"),
        fetchFPL(`/entry/${id}/`),
      ]);
      const gw = history.current_event ||
        bootstrap.events.find(e=>e.is_current)?.id ||
        bootstrap.events.find(e=>e.is_next)?.id || 1;
      const nextGw = gw + 1;
      const teamMap = {}, playerMap = {};
      bootstrap.teams.forEach(t => { teamMap[t.id] = t.short_name; });
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
          pred, ts: p.total_points,
          own: parseFloat(p.selected_by_percent),
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
          return { id:p.id, name:p.web_name, pos:POSITIONS[p.element_type], team:teamMap[p.team],
            price:p.now_cost/10, ts:p.total_points, form:parseFloat(p.form)||0,
            fix: fix?`${fix.opponent}(${fix.home?"H":"A"})`:"BLA", fdr:fix?.difficulty||5,
            pred: fix?predictPoints(p,fix):0 };
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
            out:out.name, outTeam:out.team, outPrice:out.price,
            in:c.name, inTeam:c.team, inPrice:c.price,
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
        .map((p,i)=>({ name:p.name, team:p.team, fix:p.fix, pred:p.pred, conf:[82,74,65][i], own:p.own, status:p.status }));
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
            <button style={{background:C.surface,color:C.text,border:`1px solid ${C.border}`,borderRadius:7,padding:"9px 16px",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:".04em"}}>QUICK OPTIMISE</button>
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
          <PlayerListPanel allPlayers={data.allPlayers} filterPos={filterPos} setFilterPos={setFilterPos} sortBy={sortBy} setSortBy={setSortBy}/>
        </div>

        {/* Centre — pitch */}
        <div style={{overflow:"auto",padding:"20px"}}>
          <Pitch players={data.players} onPlayerClick={setSelectedPlayer} selectedId={selectedPlayer?.id}/>

          {/* Selected player detail */}
          {selectedPlayer&&(
            <div style={{marginTop:16,background:C.card,border:`1px solid ${C.accent}44`,borderRadius:10,padding:"14px 16px",animation:"fadeUp .25s ease"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:8,background:POS_COLOR[selectedPlayer.pos]+"22",border:`1px solid ${POS_COLOR[selectedPlayer.pos]}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:POS_COLOR[selectedPlayer.pos]}}>{selectedPlayer.pos}</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:900,color:C.text,lineHeight:1}}>{selectedPlayer.name}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>{selectedPlayer.team} · £{selectedPlayer.price}m · Owned: {selectedPlayer.own}%</div>
                </div>
                <div style={{display:"flex",gap:16}}>
                  {[["FORM",selectedPlayer.form,C.green],["PRED",selectedPlayer.pred,C.accent],["TS",selectedPlayer.ts,C.amber]].map(([l,v,col])=>(
                    <div key={l} style={{textAlign:"center"}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,fontWeight:900,color:col,lineHeight:1}}>{v}</div>
                      <div style={{fontSize:9,color:C.muted,letterSpacing:".1em"}}>{l}</div>
                    </div>
                  ))}
                </div>
                <button onClick={()=>setSelectedPlayer(null)} style={{background:"transparent",color:C.muted,border:"none",fontSize:18,cursor:"pointer",padding:"4px 8px"}}>×</button>
              </div>
            </div>
          )}
        </div>

        {/* Right — recommendations */}
        <div style={{borderLeft:`1px solid ${C.border}`,overflow:"auto"}}>
          <RightPanel section={section} data={MOCK} selectedPlayer={selectedPlayer}/>
        </div>
      </div>
    </div>
  );
}
