import AdminEmailTool from './components/AdminEmailTool';
import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

const C = {
  bg:"#E8E8E4", nav:"#2C2C2A", panel:"#D4D1C7", card:"#C8C5BC",
  border:"#C0BDB4", text:"#1A1A1A", secondary:"#4A4844", muted:"#6F6E68",
  accent:"#3D5BD4", accentDim:"#DCE4F8", green:"#3A8A5A", greenDim:"#D0E8D8",
  amber:"#8A6010", amberDim:"#EEE0B0", red:"#B84A2A", redDim:"#EED8C8",
};

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background:C.panel, border:`0.5px solid ${C.border}`, borderRadius:12,
      padding:"18px 22px", flex:1, minWidth:140 }}>
      <div style={{ fontSize:9, color:C.muted, letterSpacing:".12em", textTransform:"uppercase",
        fontWeight:600, marginBottom:8, textAlign:"center" }}>{label}</div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:36, fontWeight:800,
        color:color||C.accent, lineHeight:1, textAlign:"center" }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:C.muted, marginTop:6, textAlign:"center" }}>{sub}</div>}
    </div>
  );
}

function DayChart({ users }) {
  const days = {};
  const now = Date.now();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = d.toLocaleDateString("en-GB", { day:"numeric", month:"short" });
    days[key] = 0;
  }
  users.forEach(u => {
    const d = new Date(u.createdAt);
    const key = d.toLocaleDateString("en-GB", { day:"numeric", month:"short" });
    if (days[key] !== undefined) days[key]++;
  });
  const entries = Object.entries(days);
  const max = Math.max(...entries.map(([,v]) => v), 1);

  return (
    <div style={{ background:C.panel, border:`0.5px solid ${C.border}`, borderRadius:12,
      padding:"16px 20px", marginBottom:16 }}>
      <div style={{ fontSize:9, color:C.muted, letterSpacing:".12em", textTransform:"uppercase",
        fontWeight:600, marginBottom:14, textAlign:"center" }}>New signups — last 14 days</div>
      <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:80 }}>
        {entries.map(([label, count]) => (
          <div key={label} style={{ flex:1, display:"flex", flexDirection:"column",
            alignItems:"center", gap:3 }}>
            <div style={{ fontSize:9, fontWeight:600, color:count > 0 ? C.accent : C.muted }}>
              {count > 0 ? count : ""}
            </div>
            <div style={{ width:"100%", background: count > 0 ? C.accent : C.border,
              borderRadius:"3px 3px 0 0", opacity: count > 0 ? 1 : 0.4,
              height: Math.max((count / max) * 60, count > 0 ? 6 : 2) }} />
            <div style={{ fontSize:7, color:C.muted, textAlign:"center",
              transform:"rotate(-45deg)", transformOrigin:"top left",
              whiteSpace:"nowrap", marginTop:2 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [copied, setCopied] = useState("");

  const isAdmin = user?.publicMetadata?.role === "admin";

  useEffect(() => {
    if (!isLoaded) return;
    if (!isAdmin) { navigate("/app"); return; }
    loadUsers();
  }, [isLoaded, isAdmin]);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      const res = await fetch("/api/admin-users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  function copyEmail(email) {
    navigator.clipboard.writeText(email);
    setCopied(email);
    setTimeout(() => setCopied(""), 2000);
  }

  function copyAllEmails() {
    const emails = filtered.map(u => u.email).join("\n");
    navigator.clipboard.writeText(emails);
    setCopied("all");
    setTimeout(() => setCopied(""), 2000);
  }

  const now = Date.now();
  const today = users.filter(u => now - u.createdAt < 86400000).length;
  const thisWeek = users.filter(u => now - u.createdAt < 7 * 86400000).length;
  const withFpl = users.filter(u => u.fplTeamId).length;
  const activeToday = users.filter(u => u.lastSignIn && now - u.lastSignIn < 86400000).length;

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      u.email.toLowerCase().includes(q) ||
      (u.firstName + " " + u.lastName).toLowerCase().includes(q) ||
      String(u.fplTeamId || "").includes(q);
    const matchFilter =
      filter === "all" ? true :
      filter === "fpl" ? !!u.fplTeamId :
      filter === "nofpl" ? !u.fplTeamId :
      filter === "active" ? (u.lastSignIn && now - u.lastSignIn < 86400000) : true;
    return matchSearch && matchFilter;
  });

  function fmt(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    const diff = now - ts;
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
    if (diff < 7*86400000) return `${Math.floor(diff/86400000)}d ago`;
    return d.toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
  }

  if (!isLoaded) return null;
  if (!isAdmin) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center" }}>
      <div style={{ color:C.red, fontSize:14 }}>Access denied.</div>
    </div>
  );

  return (
    <div style={{ background:C.bg, minHeight:"100vh", fontFamily:"Inter,sans-serif" }}>

      {/* NAV */}
      <div style={{ background:C.nav, padding:"0 28px", height:56, display:"flex",
        alignItems:"center", justifyContent:"space-between",
        borderBottom:`0.5px solid #3A3A38` }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800,
            color:"#F0EEE8", letterSpacing:"-0.03em" }}>
            p<span style={{ color:"#7BAEFF" }}>FPL!</span>
          </div>
          <div style={{ fontSize:7.5, color:"#7A7A72", letterSpacing:"0.22em",
            textTransform:"uppercase", fontVariant:"small-caps", marginTop:2 }}>
            predictive fantasy football
          </div>
        </div>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700,
          color:"#7BAEFF", letterSpacing:"0.08em" }}>ADMIN DASHBOARD</div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => navigate("/app")}
            style={{ background:"transparent", border:`1px solid #3A3A38`, color:"#7A7A72",
              borderRadius:20, padding:"6px 14px", fontSize:11, cursor:"pointer" }}>
            Back to App
          </button>
          <button onClick={loadUsers}
            style={{ background:"#3D5BD4", border:"none", color:"#fff",
              borderRadius:20, padding:"6px 14px", fontSize:11, cursor:"pointer",
              fontWeight:600 }}>
            Refresh
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:24 }}>

        {/* STAT CARDS */}
        <div style={{ display:"flex", gap:12, marginBottom:16 }}>
          <StatCard label="Total users" value={total} sub="all time" color={C.accent}/>
          <StatCard label="New today" value={today} sub="last 24 hours" color={C.green}/>
          <StatCard label="This week" value={thisWeek} sub="last 7 days" color={C.green}/>
          <StatCard label="FPL ID saved" value={withFpl}
            sub={`${total ? Math.round(withFpl/total*100) : 0}% of users`} color={C.amber}/>
          <StatCard label="Active today" value={activeToday} sub="signed in today" color={C.accent}/>
        </div>

        {/* CHART */}
        {users.length > 0 && <DayChart users={users}/>}

        {/* CONTROLS */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12,
          flexWrap:"wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search email, name or FPL ID..."
            style={{ flex:1, minWidth:220, background:C.panel, border:`0.5px solid ${C.border}`,
              borderRadius:8, padding:"8px 12px", fontSize:12, color:C.text,
              outline:"none", fontFamily:"inherit" }}/>
          {["all","fpl","nofpl","active"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding:"7px 14px", borderRadius:20, fontSize:11, fontWeight:500,
                cursor:"pointer", border:`1px solid ${filter===f ? C.accent : C.border}`,
                background: filter===f ? C.accentDim : "transparent",
                color: filter===f ? C.accent : C.muted }}>
              {f === "all" ? "All users" : f === "fpl" ? "Has FPL ID" :
               f === "nofpl" ? "No FPL ID" : "Active today"}
            </button>
          ))}
          <button onClick={copyAllEmails}
            style={{ padding:"7px 14px", borderRadius:20, fontSize:11, fontWeight:500,
              cursor:"pointer", border:`1px solid ${C.border}`, background:C.panel,
              color:C.secondary }}>
            {copied === "all" ? "✓ Copied!" : `Copy ${filtered.length} emails`}
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div style={{ background:C.redDim, border:`0.5px solid ${C.red}44`,
            borderRadius:8, padding:"10px 14px", color:C.red, fontSize:12, marginBottom:12 }}>
            Error loading users: {error}. Make sure CLERK_SECRET_KEY is set in Vercel environment variables.
          </div>
        )}

        {/* TABLE */}
        <div style={{ background:C.panel, border:`0.5px solid ${C.border}`,
          borderRadius:12, overflow:"hidden" }}>

          {/* Header */}
          <div style={{ display:"grid",
            gridTemplateColumns:"32px 1fr 180px 90px 90px 90px 60px",
            padding:"8px 16px", borderBottom:`0.5px solid ${C.border}`,
            background:C.card }}>
            {["#","Email / Name","Signed up","Last seen","FPL ID","Status",""].map(h => (
              <div key={h} style={{ fontSize:8, fontWeight:600, color:C.muted,
                letterSpacing:".08em", textAlign:"center" }}>{h}</div>
            ))}
          </div>

          {loading && (
            <div style={{ padding:40, textAlign:"center" }}>
              <span style={{ width:24, height:24, border:`2px solid ${C.border}`,
                borderTopColor:C.accent, borderRadius:"50%", display:"inline-block",
                animation:"spin .7s linear infinite" }}/>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ padding:40, textAlign:"center", color:C.muted, fontSize:12 }}>
              No users found
            </div>
          )}

          {!loading && filtered.map((u, i) => {
            const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
            const isNew = now - u.createdAt < 86400000;
            const isActive = u.lastSignIn && now - u.lastSignIn < 3600000;
            return (
              <div key={u.id} style={{
                display:"grid",
                gridTemplateColumns:"32px 1fr 180px 90px 90px 90px 60px",
                padding:"10px 16px",
                borderBottom:`0.5px solid ${C.border}22`,
                background: i%2===0 ? "transparent" : `${C.card}44`,
                alignItems:"center",
              }}>
                <div style={{ fontSize:10, color:C.muted, textAlign:"center" }}>{i+1}</div>
                <div>
                  <div style={{ fontSize:12, fontWeight:500, color:C.text,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {u.email}
                    {isNew && (
                      <span style={{ marginLeft:6, fontSize:8, fontWeight:700,
                        background:C.greenDim, color:C.green, borderRadius:4,
                        padding:"1px 5px", border:`0.5px solid ${C.green}33` }}>NEW</span>
                    )}
                  </div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:1 }}>{name}</div>
                </div>
                <div style={{ fontSize:10, color:C.secondary, textAlign:"center" }}>
                  {fmt(u.createdAt)}
                </div>
                <div style={{ fontSize:10, textAlign:"center",
                  color: isActive ? C.green : C.muted }}>
                  {fmt(u.lastSignIn)}
                </div>
                <div style={{ fontSize:10, textAlign:"center",
                  color: u.fplTeamId ? C.accent : C.muted, fontWeight: u.fplTeamId ? 600 : 400 }}>
                  {u.fplTeamId || "—"}
                </div>
                <div style={{ textAlign:"center" }}>
                  <span style={{
                    fontSize:8, fontWeight:700, padding:"2px 7px", borderRadius:10,
                    background: isActive ? C.greenDim : C.card,
                    color: isActive ? C.green : C.muted,
                    border:`0.5px solid ${isActive ? C.green+"33" : C.border}`,
                  }}>
                    {isActive ? "Online" : "Offline"}
                  </span>
                </div>
                <div style={{ textAlign:"center" }}>
                  <button onClick={() => copyEmail(u.email)}
                    style={{ background:"transparent", border:`0.5px solid ${C.border}`,
                      borderRadius:6, padding:"3px 8px", fontSize:9, cursor:"pointer",
                      color: copied===u.email ? C.green : C.muted }}>
                    {copied === u.email ? "✓" : "Copy"}
                  </button>
                </div>
              </div>
            );
          })}

          {!loading && filtered.length > 0 && (
            <div style={{ padding:"10px 16px", borderTop:`0.5px solid ${C.border}`,
              fontSize:10, color:C.muted, textAlign:"center" }}>
              Showing {filtered.length} of {total} users
            </div>
          )}
        </div>
      </div>

      <AdminEmailTool />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #6F6E68; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
