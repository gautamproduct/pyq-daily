import { supabaseAdmin } from "../../lib/supabase";

// Best-effort analytics event logger. Never blocks the UI on failure.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { device_id, event_name, metadata } = req.body || {};
  if (!event_name) return res.status(400).json({ error: "Missing event_name" });

  try {
    const db = supabaseAdmin();
    let player_id = null;
    if (device_id) {
      const { data: player } = await db
        .from("players")
        .select("id")
        .eq("device_id", device_id)
        .maybeSingle();
      player_id = player?.id || null;
    }
    await db.from("events").insert({ player_id, event_name, metadata: metadata || {} });
  } catch (e) {
    // swallow — analytics must never break the app
  }

  return res.status(200).json({ ok: true });
}
