import { supabaseAdmin } from "../../lib/supabase";
import { ensureDailySet } from "../../lib/daily-set";
import { todayIST, isChallengeOpen } from "../../lib/campaign";

function prevDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { device_id, class: klass, exam, answers } = req.body || {};
  if (!device_id || !klass || !exam || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: "Missing device_id, class, exam or answers" });
  }

  const setDate = todayIST();
  if (!isChallengeOpen(setDate)) {
    return res.status(403).json({ error: "Challenge is closed for today" });
  }

  const db = supabaseAdmin();

  const { data: player, error: playerErr } = await db
    .from("players")
    .select("*")
    .eq("device_id", device_id)
    .maybeSingle();
  if (playerErr) return res.status(500).json({ error: playerErr.message });
  if (!player) return res.status(400).json({ error: "Unknown player — register first" });

  let dailySet;
  try {
    dailySet = await ensureDailySet(setDate, klass, exam);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  const { data: questions, error: qErr } = await db
    .from("questions")
    .select("*")
    .in("id", dailySet.question_ids);
  if (qErr) return res.status(500).json({ error: qErr.message });
  const byId = Object.fromEntries((questions || []).map((q) => [q.id, q]));

  const rows = [];
  for (const a of answers) {
    const q = byId[a.question_id];
    if (!q) continue;
    rows.push({
      player_id: player.id,
      question_id: q.id,
      class: klass,
      exam,
      set_date: setDate,
      selected_option: a.selected_option || null,
      is_correct: a.selected_option === q.correct_option,
      time_taken_ms: a.time_taken_ms || null,
    });
  }
  if (rows.length === 0) return res.status(400).json({ error: "No valid answers" });

  const { error: insertErr } = await db
    .from("attempts")
    .upsert(rows, { onConflict: "player_id,question_id,set_date" });
  if (insertErr) return res.status(500).json({ error: insertErr.message });

  // Update streak only once the full daily set is completed.
  const { data: allAttempts } = await db
    .from("attempts")
    .select("id")
    .eq("player_id", player.id)
    .eq("set_date", setDate)
    .in("question_id", dailySet.question_ids);

  let streak = null;
  if ((allAttempts || []).length >= dailySet.question_ids.length) {
    const { data: existingStreak } = await db
      .from("streaks")
      .select("*")
      .eq("player_id", player.id)
      .maybeSingle();

    let current = 1;
    let longest = existingStreak?.longest_streak || 0;
    if (existingStreak?.last_played_date === setDate) {
      current = existingStreak.current_streak;
    } else if (existingStreak?.last_played_date === prevDate(setDate)) {
      current = (existingStreak.current_streak || 0) + 1;
    }
    longest = Math.max(longest, current);

    const { data: streakRow } = await db
      .from("streaks")
      .upsert(
        { player_id: player.id, current_streak: current, longest_streak: longest, last_played_date: setDate },
        { onConflict: "player_id" }
      )
      .select("*")
      .single();
    streak = streakRow;
  }

  const results = dailySet.question_ids.map((id) => {
    const q = byId[id];
    const row = rows.find((r) => r.question_id === id);
    return {
      question_id: id,
      question: q.question,
      chapter: q.chapter,
      year: q.year,
      correct_option: q.correct_option,
      solution: q.solution,
      selected_option: row?.selected_option || null,
      is_correct: row?.is_correct || false,
    };
  });

  const score = results.filter((r) => r.is_correct).length;

  return res.status(200).json({ score, total: results.length, results, streak });
}
