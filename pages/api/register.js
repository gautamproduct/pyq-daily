import { supabaseAdmin } from "../../lib/supabase";
import { variantForRequest } from "../../lib/variant";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { device_id, name, class: klass, exam } = req.body || {};
  if (!device_id || !name || !klass || !exam) {
    return res.status(400).json({ error: "Missing device_id, name, class or exam" });
  }
  if (!["11", "12", "dropper"].includes(klass)) {
    return res.status(400).json({ error: "Invalid class" });
  }
  if (!["JEE", "NEET"].includes(exam)) {
    return res.status(400).json({ error: "Invalid exam" });
  }

  // Which experiment arm they're on is decided once, here, from the domain
  // they registered through — never re-derived later.
  const variant = variantForRequest(req);

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
