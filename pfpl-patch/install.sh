#!/usr/bin/env bash
# ============================================================
# pFPL Quick Install
# 1. Put this file in your project root
# 2. Put the pfpl-patch/ folder in your project root
# 3. Run: bash install.sh
# ============================================================

set -e
echo ""
echo "🚀 pFPL Patch Installer"
echo "========================"
echo ""

# Check we're in the right place
if [ ! -f "package.json" ]; then
  echo "❌ Run this from your project root (where package.json lives)"
  exit 1
fi

if [ ! -d "pfpl-patch" ]; then
  echo "❌ pfpl-patch/ folder not found. Put it in your project root first."
  exit 1
fi

# ── Step 1: Install npm packages
echo "📦 Installing npm packages..."
npm install @supabase/supabase-js stripe svix resend --save
echo "✅ Packages installed"
echo ""

# ── Step 2: Create directories
mkdir -p src/components src/hooks src/lib api/lib supabase

# ── Step 3: Copy API files
echo "📁 Copying API files..."
cp pfpl-patch/api/admin-users.js       api/admin-users.js
cp pfpl-patch/api/admin-email.js       api/admin-email.js
cp pfpl-patch/api/injuries.js          api/injuries.js
cp pfpl-patch/api/stripe-checkout.js   api/stripe-checkout.js
cp pfpl-patch/api/stripe-webhook.js    api/stripe-webhook.js
cp pfpl-patch/api/clerk-webhook.js     api/clerk-webhook.js
cp pfpl-patch/api/lib/supabase-admin.js api/lib/supabase-admin.js
cp pfpl-patch/api/lib/security.js      api/lib/security.js
echo "✅ API files copied"

# ── Step 4: Copy source files
echo "📁 Copying source files..."
cp pfpl-patch/src/lib/supabase.js                src/lib/supabase.js
cp pfpl-patch/src/hooks/useSubscription.js       src/hooks/useSubscription.js
cp pfpl-patch/src/components/InjuriesTab.jsx     src/components/InjuriesTab.jsx
cp pfpl-patch/src/components/OpponentTeamModal.jsx src/components/OpponentTeamModal.jsx
cp pfpl-patch/src/components/AdminEmailTool.jsx  src/components/AdminEmailTool.jsx
echo "✅ Source files copied"

# ── Step 5: Copy config files
echo "📁 Copying config files..."
cp pfpl-patch/vercel.json               vercel.json
cp pfpl-patch/TECHNICAL.md              TECHNICAL.md
cp pfpl-patch/INTEGRATION.js            INTEGRATION.js
cp pfpl-patch/src/global.css.patch      global.css.patch

# Copy schema — don't overwrite if supabase dir has files
cp pfpl-patch/supabase/schema.sql       supabase/schema.sql 2>/dev/null || true
echo "✅ Config files copied"
echo ""

# ── Step 6: Append CSS patch to main CSS file
CSS_FILE=""
for f in src/index.css src/App.css src/styles/global.css src/styles/index.css; do
  if [ -f "$f" ]; then
    CSS_FILE="$f"
    break
  fi
done

if [ -n "$CSS_FILE" ]; then
  echo "🎨 Appending CSS patches to $CSS_FILE..."
  echo "" >> "$CSS_FILE"
  echo "/* ── pFPL UI Patches ── */" >> "$CSS_FILE"
  cat global.css.patch >> "$CSS_FILE"
  rm global.css.patch
  echo "✅ CSS patched: $CSS_FILE"
else
  echo "⚠️  Could not find main CSS file. Manually paste global.css.patch into your CSS."
fi
echo ""

# ── Done
echo "╔═══════════════════════════════════════════╗"
echo "║  ✅  Install complete!                    ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "📋 MANUAL STEPS REMAINING:"
echo ""
echo "  1. Add to App.jsx / Router:"
echo "     - import InjuriesTab and add Injuries tab"
echo "     - See INTEGRATION.js for exact code snippets"
echo ""
echo "  2. Add to AdminPage.jsx:"
echo "     - import AdminEmailTool and add <AdminEmailTool />"
echo ""
echo "  3. Add to Leagues component:"
echo "     - import OpponentTeamModal"
echo "     - Make opponent names clickable (see INTEGRATION.js)"
echo ""
echo "  4. Run Supabase schema:"
echo "     - Open supabase/schema.sql"
echo "     - Paste into Supabase Dashboard → SQL Editor → Run"
echo ""
echo "  5. Add environment variables to Vercel:"
echo "     - See TECHNICAL.md Section 5 for the full list"
echo "     - Minimum needed today: CLERK_SECRET_KEY"
echo ""
echo "  6. Register webhooks:"
echo "     - Clerk: https://predictivefpl.com/api/clerk-webhook"
echo "     - Stripe: https://predictivefpl.com/api/stripe-webhook"
echo ""
echo "  7. Commit and push:"
echo "     git add . && git commit -m 'feat: injuries tab, email tool, security, payments, UI fixes' && git push"
echo ""
