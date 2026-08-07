import { supabaseAdmin } from "../../lib/supabase";
import { variantForRequest } from "../../lib/variant";

// Best-effort analytics event logger. Never blocks the UI on failure.
// Every event is tagged with `variant` directly (not just derivable via a
// join to players) so all A/B comparisons can be done straight off this
// table — including pre-registration events like `page_view`, which have
// no player yet and fall back to the request's host.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { device_id, event_name, metadata } = req.body || {};
  if (!event_name) return res.status(400).json({ error: "Missing event_name" });

  try {
    const db = supabaseAdmin();
    let player_id = null;
    let variant = null;
    if (device_id) {
      const { data: player } = await db
        .from("players")
        .select("id, variant")
        .eq("device_id", device_id)
        .maybeSingle();
      player_id = player?.id || null;
      variant = player?.variant || null;
    }
    if (!variant) variant = variantForRequest(req);

    await db.from("events").insert({ player_id, event_name, variant, metadata: metadata || {} });
  } catch (e) {
    // swallow — analytics must never break the app
  }

  return res.status(200).json({ ok: true });
}
