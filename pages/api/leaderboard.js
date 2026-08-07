import { supabaseAdmin } from "../../lib/supabase";
import { todayIST } from "../../lib/campaign";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { class: klass, exam, date } = req.query;
  if (!klass || !exam) return res.status(400).json({ error: "Missing class or exam" });

  const setDate = date || todayIST();
  const db = supabaseAdmin();

  const { data: attempts, error } = await db
    .from("attempts")
    .select("player_id, is_correct, time_taken_ms")
    .eq("class", klass)
    .eq("exam", exam)
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
  let streaks = {};
  if (playerIds.length > 0) {
    const { data: players } = await db.from("players").select("id, name").in("id", playerIds);
    names = Object.fromEntries((players || []).map((p) => [p.id, p.name]));

    const { data: streakRows } = await db
      .from("streaks")
      .select("player_id, current_streak")
      .in("player_id", playerIds);
    streaks = Object.fromEntries((streakRows || []).map((s) => [s.player_id, s.current_streak]));
  }

  const rows = playerIds
    .map((id) => ({
      player_id: id,
      name: names[id] || "Anonymous",
      correct: byPlayer[id].correct,
      answered: byPlayer[id].answered,
      timeMs: byPlayer[id].timeMs,
      streak: streaks[id] || 0,
    }))
    .sort((a, b) => b.correct - a.correct || a.timeMs - b.timeMs)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  return res.status(200).json({ setDate, leaderboard: rows });
}
