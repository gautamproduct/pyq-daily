import { supabaseAdmin } from "../../lib/supabase";
import { isFinalLeaderboardLive, CHALLENGE_END_DATE, CAMPAIGN_START } from "../../lib/campaign";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { class: klass, exam } = req.query;
  if (!klass || !exam) return res.status(400).json({ error: "Missing class or exam" });

  if (!isFinalLeaderboardLive()) {
    return res.status(200).json({ locked: true });
  }

  const db = supabaseAdmin();

  const { data: attempts, error } = await db
    .from("attempts")
    .select("player_id, is_correct, time_taken_ms, set_date")
    .eq("class", klass)
    .eq("exam", exam)
    .gte("set_date", CAMPAIGN_START)
    .lte("set_date", CHALLENGE_END_DATE);
  if (error) return res.status(500).json({ error: error.message });

  const byPlayer = {};
  for (const a of attempts || []) {
    if (!byPlayer[a.player_id]) {
      byPlayer[a.player_id] = { correct: 0, timeMs: 0, answered: 0, days: new Set() };
    }
    byPlayer[a.player_id].answered += 1;
    if (a.is_correct) byPlayer[a.player_id].correct += 1;
    byPlayer[a.player_id].timeMs += a.time_taken_ms || 0;
    byPlayer[a.player_id].days.add(a.set_date);
  }

  const playerIds = Object.keys(byPlayer);
  let names = {};
  let longestStreaks = {};
  if (playerIds.length > 0) {
    const { data: players } = await db.from("players").select("id, name").in("id", playerIds);
    names = Object.fromEntries((players || []).map((p) => [p.id, p.name]));

    const { data: streakRows } = await db
      .from("streaks")
      .select("player_id, longest_streak")
      .in("player_id", playerIds);
    longestStreaks = Object.fromEntries((streakRows || []).map((s) => [s.player_id, s.longest_streak]));
  }

  const rows = playerIds
    .map((id) => ({
      player_id: id,
      name: names[id] || "Anonymous",
      correct: byPlayer[id].correct,
      answered: byPlayer[id].answered,
      daysPlayed: byPlayer[id].days.size,
      longestStreak: longestStreaks[id] || 0,
      timeMs: byPlayer[id].timeMs,
    }))
    // Rank consistency first (days played), then accuracy, then speed —
    // rewards discipline over a single lucky day.
    .sort(
      (a, b) =>
        b.daysPlayed - a.daysPlayed || b.correct - a.correct || a.timeMs - b.timeMs
    )
    .map((r, i) => ({ ...r, rank: i + 1 }));

  return res.status(200).json({ locked: false, leaderboard: rows });
}
