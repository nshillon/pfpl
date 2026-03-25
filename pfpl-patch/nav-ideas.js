// ============================================================
// ITEM 1: Navigation Trim Ideas
// Copy this into your App.jsx / navigation component
// ============================================================

// SUGGESTED NAVIGATION STRUCTURE:
// Keep only these tabs, in this order:
//
//  ⚡ My Team          → Your squad on the pitch (the hero view)
//  🔄 Transfers        → Quick Optimise lives here
//  📅 GW Planner       → Multi-GW planning
//  📊 Stats            → Merged: Assistant Manager + squad stats
//  🏆 Leagues          → Mini-league + H2H tables
//  📉 FDR              → Fixture difficulty
//  🏥 Injuries         → NEW: injury report
//  ⚙️  Settings         → Profile, FPL team ID, subscription

// REMOVE / MERGE:
//  - "Assistant Manager" → merge into "Stats" tab
//  - Separate "Squad Stats" panel → make it a sub-tab inside Stats
//  - Any duplicate "analyse" buttons → keep just "Quick Optimise"
//  - Any "About" or marketing tabs → move to footer only

// HOW TO IMPLEMENT — replace your tab array with:
export const TABS = [
  { id: "team",      label: "My Team",    icon: "⚡" },
  { id: "transfers", label: "Transfers",  icon: "🔄" },
  { id: "planner",   label: "GW Planner", icon: "📅" },
  { id: "stats",     label: "Stats",      icon: "📊" },
  { id: "leagues",   label: "Leagues",    icon: "🏆" },
  { id: "fdr",       label: "FDR",        icon: "📉" },
  { id: "injuries",  label: "Injuries",   icon: "🏥" },
  { id: "settings",  label: "Settings",   icon: "⚙️"  },
];

// QUICK WINS for cleaner look:
// 1. Remove icon + label on mobile — show icon only
// 2. Highlight active tab with a bottom border, not a filled background
// 3. Use a horizontal scrollable nav on mobile (overflow-x: auto, no wrap)
