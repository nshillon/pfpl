// ============================================================
// INTEGRATION GUIDE — how to wire all new files into your app
// These are the changes you need to make to EXISTING files
// ============================================================

// ══════════════════════════════════════════════════════════════
// 1. src/App.jsx — add Injuries tab
// ══════════════════════════════════════════════════════════════
// Add import at the top:
import InjuriesTab from './components/InjuriesTab';

// Add to your tab routing (wherever you render tab content):
// {activeTab === 'injuries' && <InjuriesTab />}

// Add 'Injuries' to your nav array (see nav-ideas.js)


// ══════════════════════════════════════════════════════════════
// 2. src/AdminPage.jsx — add Email Marketing tool
// ══════════════════════════════════════════════════════════════
// Add import at the top:
import AdminEmailTool from './components/AdminEmailTool';

// Add below your existing user stats section:
// <AdminEmailTool />


// ══════════════════════════════════════════════════════════════
// 3. Leagues component — add opponent team popup
// ══════════════════════════════════════════════════════════════
// In whichever component renders your league tables:
import { useState } from 'react';
import OpponentTeamModal from './components/OpponentTeamModal';

// Inside the component, add state:
const [opponent, setOpponent] = useState(null); // { entryId, managerName }

// When rendering an opponent's name in the table, make it clickable:
<button
  onClick={() => setOpponent({ entryId: entry.entry, managerName: entry.player_name })}
  style={{
    background: 'none', border: 'none', padding: 0,
    color: 'var(--accent, #6366f1)', cursor: 'pointer',
    textDecoration: 'underline', fontWeight: 600,
    fontSize: 'inherit',
  }}
>
  {entry.player_name}
</button>

// At the bottom of your JSX (outside table), render the modal:
{opponent && (
  <OpponentTeamModal
    entryId={opponent.entryId}
    managerName={opponent.managerName}
    gameweek={currentGameweek} // pass your current GW number
    onClose={() => setOpponent(null)}
  />
)}


// ══════════════════════════════════════════════════════════════
// 4. src/index.css (or App.css) — apply CSS patches
// ══════════════════════════════════════════════════════════════
// At the bottom of your main CSS file, paste the entire contents
// of: pfpl-patch/src/global.css.patch
//
// Then, if you're using CSS variables, make sure you have these
// in your :root block:
/*
:root {
  --font-brand: 'Your chosen font', sans-serif;
  --accent: #6366f1;
  --card-bg: #1a1a2e;
  --card-header-bg: #12122a;
  --border: #2a2a3e;
  --text-primary: #ffffff;
  --text-muted: #888888;
  --modal-bg: #0f0f1e;
}
*/


// ══════════════════════════════════════════════════════════════
// 5. Add Supabase to frontend
// ══════════════════════════════════════════════════════════════
// In any component that needs user plan data:
import { useSubscription } from '../hooks/useSubscription';

const { isPro, startCheckout, checkoutLoading } = useSubscription();

// Lock pro features:
{!isPro && (
  <div>
    <p>This feature is Pro only</p>
    <button onClick={startCheckout} disabled={checkoutLoading}>
      {checkoutLoading ? 'Loading...' : 'Upgrade to Pro'}
    </button>
  </div>
)}


// ══════════════════════════════════════════════════════════════
// 6. package.json — add dependencies
// ══════════════════════════════════════════════════════════════
// Run these from your project root:
// npm install @supabase/supabase-js stripe svix resend
