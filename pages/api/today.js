import { supabaseAdmin } from "../../lib/supabase";
import { ensureDailySet } from "../../lib/daily-set";
import { todayIST, isChallengeOpen } from "../../lib/campaign";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { class: klass, exam, device_id } = req.query;
  if (!klass || !exam) {
    return res.status(400).json({ error: "Missing class or exam" });
  }

  const setDate = todayIST();
  const db = supabaseAdmin();

  if (!isChallengeOpen(setDate)) {
    return res.status(200).json({ challengeClosed: true, setDate });
  }

  let dailySet;
  try {
    dailySet = await ensureDailySet(setDate, klass, exam);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  const { data: questions, error: qErr } = await db
    .from("questions")
    .select("id, subject, chapter, year, question, option_a, option_b, option_c, option_d")
    .in("id", dailySet.question_ids);
  if (qErr) return res.status(500).json({ error: qErr.message });

  // Preserve the daily_set's order.
  const byId = Object.fromEntries((questions || []).map((q) => [q.id, q]));
  const orderedQuestions = dailySet.question_ids.map((id) => byId[id]).filter(Boolean);

  let completed = false;
  let player = null;
  if (device_id) {
    const { data: p } = await db
      .from("players")
      .select("*")
      .eq("device_id", device_id)
      .maybeSingle();
    player = p || null;

    if (player) {
      const { data: attempts } = await db
        .from("attempts")
        .select("id")
        .eq("player_id", player.id)
        .eq("set_date", setDate)
        .in("question_id", dailySet.question_ids);
      completed = (attempts || []).length >= orderedQuestions.length && orderedQuestions.length > 0;
    }
  }

  return res.status(200).json({
    setDate,
    questions: orderedQuestions,
    completed,
    player,
  });
}
