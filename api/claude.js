export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { gw, teamName, captain, blanks, doubts, topPlayers, bank, topTransfer } = req.body;

  const content = `GW${gw} FPL analysis for ${teamName}:
- Captain: ${captain || "unknown"}
- Blank GW players (no fixture): ${blanks?.join(", ") || "none"}
- Fitness doubts: ${doubts?.join(", ") || "none"}
- Top predicted scorers: ${topPlayers?.join(", ")}
- Top transfer suggestion: ${topTransfer || "squad looks solid"}
- Bank: £${bank}m

Give me sharp, direct gameweek advice.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: "You are an elite Fantasy Premier League analyst. Give sharp, confident, punchy gameweek advice. Use football language naturally. Be direct and specific. Keep it to 3-4 sentences max. No fluff.",
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return res.status(response.status).json({ error: "Claude API error", detail: err });
  }

  const data = await response.json();
  const text = data.content?.find(b => b.type === "text")?.text || "Analysis unavailable.";
  return res.status(200).json({ text });
}
