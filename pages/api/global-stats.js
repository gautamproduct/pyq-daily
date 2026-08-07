import { supabaseAdmin } from "../../lib/supabase";

// Platform-wide numbers for the homepage — total joined + how many are
// "on track" (2+ day streak). Framed to always read as encouraging, never
// as "look how empty this is": callers should hide a stat rather than show
// a discouraging near-zero number (see LiveStats/ConsistencyStat in the UI).
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const db = supabaseAdmin();

  const { count: totalParticipants } = await db
    .from("players")
    .select("id", { count: "exact", head: true });

  const { count: onTrack } = await db
    .from("streaks")
    .select("player_id", { count: "exact", head: true })
    .gte("current_streak", 2);

  return res.status(200).json({
    totalParticipants: totalParticipants || 0,
    onTrack: onTrack || 0,
  });
}
