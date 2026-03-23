export default async function handler(req, res) {
  const path = req.query.path;
  if (!path) {
    return res.status(400).json({ error: "Missing path query parameter" });
  }

  const url = `https://fantasy.premierleague.com/api${path}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    return res.status(response.status).json({ error: "FPL API error" });
  }

  const data = await response.json();

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  return res.status(200).json(data);
}
