import { supabaseAdmin } from "../../lib/supabase";
import { todayIST } from "../../lib/campaign";

// Light social-proof counter — how many distinct players have completed
// today's set so far (optionally scoped to a class+exam group).
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { class: klass, exam } = req.query;
  const setDate = todayIST();
  const db = supabaseAdmin();

  let query = db.from("attempts").select("player_id").eq("set_date", setDate);
  if (klass) query = query.eq("class", klass);
  if (exam) query = query.eq("exam", exam);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const uniquePlayers = new Set((data || []).map((r) => r.player_id)).size;
  return res.status(200).json({ setDate, playersToday: uniquePlayers });
}
