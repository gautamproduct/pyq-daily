import { supabaseAdmin } from "../../lib/supabase";
import { todayIST } from "../../lib/campaign";
import { variantForRequest } from "../../lib/variant";
import { siteConfigForHost } from "../../lib/site-config";

// Scoped by variant as well as class+exam — a q8 player's max possible
// score (8) would otherwise always outrank a q3 player's max (3), which
// isn't "better," just a different experiment arm. Mixing them would make
// the board meaningless for both groups.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  // Dedicated single-cohort domains override whatever class/exam the client
  // sends — never trust the query string for these (same reasoning as
  // /api/today), so a hand-crafted request can't peek at another cohort's
  // leaderboard.
  const fixed = siteConfigForHost(req.headers.host);
  const klass = fixed?.class || req.query.class;
  const exam = fixed?.exam || req.query.exam;
  const { date, device_id } = req.query;
  if (!klass || !exam) return res.status(400).json({ error: "Missing class or exam" });

  const setDate = date || todayIST();
  const db = supabaseAdmin();

  const player = device_id
    ? await db.from("players").select("variant").eq("device_id", device_id).maybeSingle().then((r) => r.data || null)
    : null;
  const variant = player?.variant || variantForRequest(req);

  const { data: attempts, error } = await db
    .from("attempts")
    .select("player_id, is_correct, time_taken_ms")
    .eq("class", klass)
    .eq("exam", exam)
    .eq("variant", variant)
    .eq("set_date", setDate);
  if (error) return res.status(500).json({ error: error.message });

  const byPlayer = {};
  for (const a of attempts || []) {
    if (!byPlayer[a.player_id]) byPlayer[a.player_id] = { correct: 0, timeMs: 0, answered: 0 };
    byPlayer[a.player_id].answered += 1;
    if (a.is_correct) byPlayer[a.player_id].correct += 1;
    byPlayer[a.player_id].timeMs += a.time_taken_ms || 0;
  }

  const playerIds = Object.keys(byPlayer);
  let names = {};
  if (playerIds.length > 0) {
    const { data: players } = await db.from("players").select("id, name").in("id", playerIds);
    names = Object.fromEntries((players || []).map((p) => [p.id, p.name]));
  }

  // Rank against the FULL set first, then cap what's actually sent — at
  // 1000+ users/day this keeps the payload bounded regardless of how many
  // people played. The client paginates the capped list 20 at a time.
  const LEADERBOARD_CAP = 200;
  const rows = playerIds
    .map((id) => ({
      player_id: id,
      name: names[id] || "Anonymous",
      correct: byPlayer[id].correct,
      answered: byPlayer[id].answered,
      timeMs: byPlayer[id].timeMs,
    }))
    .sort((a, b) => b.correct - a.correct || a.timeMs - b.timeMs)
    .map((r, i) => ({ ...r, rank: i + 1 }))
    .slice(0, LEADERBOARD_CAP);

  return res.status(200).json({ setDate, leaderboard: rows, totalPlayers: playerIds.length });
}
