// api/injuries.js
// Fetches injury/availability data from official FPL API
// Summarises: player > injury type > expected return
// Cached for 1 hour to avoid hammering FPL API

let cache = { data: null, ts: 0 };
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Serve from cache if fresh
  if (cache.data && Date.now() - cache.ts < CACHE_TTL) {
    return res.status(200).json(cache.data);
  }

  try {
    const fplRes = await fetch(
      "https://fantasy.premierleague.com/api/bootstrap-static/",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; pFPL/1.0)",
          Accept: "application/json",
        },
      }
    );

    if (!fplRes.ok) {
      return res.status(502).json({ error: "FPL API unavailable", status: fplRes.status });
    }

    const fplData = await fplRes.json();

    // Build team lookup
    const teamMap = {};
    for (const t of fplData.teams || []) {
      teamMap[t.id] = t.short_name;
    }

    // Injury/doubt statuses
    const STATUSES = {
      i: "Injured",
      d: "Doubtful",
      s: "Suspended",
      u: "Unavailable",
      n: "Not in squad",
    };

    const injured = [];

    for (const p of fplData.elements || []) {
      if (!p.status || p.status === "a") continue; // skip available
      const statusLabel = STATUSES[p.status] || p.status.toUpperCase();
      const news = p.news || "";
      const returnDate = p.news_added
        ? extractReturn(news)
        : null;

      injured.push({
        id: p.id,
        name: `${p.first_name} ${p.second_name}`,
        webName: p.web_name,
        team: teamMap[p.team] || "?",
        position: ["GKP", "DEF", "MID", "FWD"][p.element_type - 1] || "?",
        status: statusLabel,
        news: news || "No details",
        expectedReturn: returnDate,
        chanceNextRound: p.chance_of_playing_next_round,
        chanceThisRound: p.chance_of_playing_this_round,
        price: (p.now_cost / 10).toFixed(1),
        selectedBy: p.selected_by_percent,
      });
    }

    // Sort: most owned first (most impactful)
    injured.sort((a, b) => parseFloat(b.selectedBy) - parseFloat(a.selectedBy));

    const payload = {
      lastUpdated: new Date().toISOString(),
      count: injured.length,
      players: injured,
    };

    cache = { data: payload, ts: Date.now() };
    return res.status(200).json(payload);
  } catch (err) {
    console.error("[injuries] Error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// Try to extract a return date/round from news text
function extractReturn(news) {
  if (!news) return null;
  const patterns = [
    /(\d+\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{0,4})/i,
    /(GW\s*\d+)/i,
    /(Gameweek\s*\d+)/i,
    /(late\s+\w+)/i,
    /(early\s+\w+)/i,
    /(unknown)/i,
    /(season)/i,
  ];
  for (const p of patterns) {
    const m = news.match(p);
    if (m) return m[1];
  }
  return null;
}
