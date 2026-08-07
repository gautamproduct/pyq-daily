import { supabaseAdmin } from "../../lib/supabase";
import { variantForRequest } from "../../lib/variant";
import { siteConfigForHost } from "../../lib/site-config";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { device_id, name } = req.body || {};
  if (!device_id || !name) {
    return res.status(400).json({ error: "Missing device_id or name" });
  }

  // Dedicated single-cohort domains bake class/exam/variant into the host —
  // never trust the client for these, so a tampered request can't land in
  // the wrong cohort's leaderboard.
  const fixed = siteConfigForHost(req.headers.host);

  let klass, exam, variant;
  if (fixed) {
    klass = fixed.class;
    exam = fixed.exam;
    variant = fixed.variant;
  } else {
    klass = req.body?.class;
    exam = req.body?.exam;
    if (!["11", "12", "dropper"].includes(klass)) {
      return res.status(400).json({ error: "Invalid class" });
    }
    if (!["JEE", "NEET"].includes(exam)) {
      return res.status(400).json({ error: "Invalid exam" });
    }
    variant = variantForRequest(req);
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("players")
    .upsert(
      { device_id, name: String(name).trim().slice(0, 60), class: klass, exam, variant },
      { onConflict: "device_id" }
    )
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ player: data });
}
