import { supabaseAdmin } from "../../lib/supabase";

// Returns the distinct chapters a player has attempted so far — the
// "syllabus covered" / consistency panel.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { device_id } = req.query;
  if (!device_id) return res.status(400).json({ error: "Missing device_id" });

  const db = supabaseAdmin();
  const { data: player } = await db
    .from("players")
    .select("id")
    .eq("device_id", device_id)
    .maybeSingle();
  if (!player) return res.status(200).json({ chapters: [] });

  const { data: attempts, error } = await db
    .from("attempts")
    .select("question_id, is_correct, questions ( chapter, subject )")
    .eq("player_id", player.id);
  if (error) return res.status(500).json({ error: error.message });

  const byChapter = {};
  for (const a of attempts || []) {
    const chapter = a.questions?.chapter || "Unlabeled";
    const subject = a.questions?.subject || "";
    const key = `${subject}::${chapter}`;
    if (!byChapter[key]) byChapter[key] = { subject, chapter, attempted: 0, correct: 0 };
    byChapter[key].attempted += 1;
    if (a.is_correct) byChapter[key].correct += 1;
  }

  const chapters = Object.values(byChapter).sort((a, b) =>
    a.subject.localeCompare(b.subject) || a.chapter.localeCompare(b.chapter)
  );

  return res.status(200).json({ chapters });
}
