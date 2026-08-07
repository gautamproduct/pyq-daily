import { supabaseAdmin } from "../../lib/supabase";
import { siteConfigForHost } from "../../lib/site-config";

// Deliberate profile edits (name/class/exam) via an explicit Profile
// screen — separate from the normal return flow, which never re-asks
// class/exam so people can't accidentally switch groups mid-leaderboard.
export default async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).end();

  const { device_id, name, class: klass, exam } = req.body || {};
  if (!device_id) return res.status(400).json({ error: "Missing device_id" });

  // Dedicated single-cohort domains never allow changing class/exam — the
  // whole point of the link is a locked cohort.
  const fixed = siteConfigForHost(req.headers.host);
  if (fixed && (klass !== undefined || exam !== undefined)) {
    return res.status(400).json({ error: "Class and exam are locked on this site" });
  }

  const updates = {};
  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) return res.status(400).json({ error: "Name can't be empty" });
    updates.name = trimmed.slice(0, 60);
  }
  if (klass !== undefined) {
    if (!["11", "12", "dropper"].includes(klass)) return res.status(400).json({ error: "Invalid class" });
    updates.class = klass;
  }
  if (exam !== undefined) {
    if (!["JEE", "NEET"].includes(exam)) return res.status(400).json({ error: "Invalid exam" });
    updates.exam = exam;
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("players")
    .update(updates)
    .eq("device_id", device_id)
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ player: data });
}
