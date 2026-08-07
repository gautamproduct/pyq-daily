import { supabaseAdmin } from "../../lib/supabase";
import { ensureDailySet } from "../../lib/daily-set";
import { todayIST, isChallengeOpen } from "../../lib/campaign";

function prevDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Records one answer at a time. The client never learns is_correct /
// correct_option / solution for an individual question here — correctness is
// only revealed once, in the end-of-quiz review (see `results` below, only
// populated when `done`).
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { device_id, class: klass, exam, question_id, selected_option, time_taken_ms } = req.body || {};
  if (!device_id || !klass || !exam || !question_id || !selected_option) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const setDate = todayIST();
  if (!isChallengeOpen(setDate)) {
    return res.status(403).json({ error: "Challenge is closed for today" });
  }

  const db = supabaseAdmin();

  // Player lookup goes first — ensureDailySet needs their variant (3 vs 8
  // questions/day) to know which daily set to build/fetch. Once we have
  // that, the daily-set and question lookups are independent and run
  // concurrently.
  const { data: player, error: playerErr } = await db
    .from("players")
    .select("*")
    .eq("device_id", device_id)
    .maybeSingle();
  if (playerErr) return res.status(500).json({ error: playerErr.message });
  if (!player) return res.status(400).json({ error: "Unknown player — register first" });

  let dailySet, question;
  try {
    const [dailySetRes, questionRes] = await Promise.all([
      ensureDailySet(setDate, klass, exam, player.variant),
      db.from("questions").select("correct_option").eq("id", question_id).single(),
    ]);
    if (questionRes.error) throw questionRes.error;
    dailySet = dailySetRes;
    question = questionRes.data;
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  if (!dailySet.question_ids.includes(question_id)) {
    return res.status(400).json({ error: "Question is not part of today's set" });
  }

  const is_correct = selected_option === question.correct_option;

  const { error: insertErr } = await db.from("attempts").upsert(
    {
      player_id: player.id,
      question_id,
      class: klass,
      exam,
      variant: player.variant,
      set_date: setDate,
      selected_option,
      is_correct,
      time_taken_ms: time_taken_ms || null,
    },
    { onConflict: "player_id,question_id,set_date" }
  );
  if (insertErr) return res.status(500).json({ error: insertErr.message });

  const { data: allAttempts } = await db
    .from("attempts")
    .select("question_id, selected_option, is_correct")
    .eq("player_id", player.id)
    .eq("set_date", setDate)
    .in("question_id", dailySet.question_ids);

  const done = (allAttempts || []).length >= dailySet.question_ids.length;

  if (!done) {
    // Nothing to reveal yet — just enough for the client to advance.
    return res.status(200).json({ done: false });
  }

  const [{ data: existingStreak }, { data: allQuestions }] = await Promise.all([
    db.from("streaks").select("*").eq("player_id", player.id).maybeSingle(),
    db.from("questions").select("*").in("id", dailySet.question_ids),
  ]);

  let current = 1;
  let longest = existingStreak?.longest_streak || 0;
  if (existingStreak?.last_played_date === setDate) {
    current = existingStreak.current_streak;
  } else if (existingStreak?.last_played_date === prevDate(setDate)) {
    current = (existingStreak.current_streak || 0) + 1;
  }
  longest = Math.max(longest, current);

  const { data: streakRow, error: streakErr } = await db
    .from("streaks")
    .upsert(
      { player_id: player.id, current_streak: current, longest_streak: longest, last_played_date: setDate },
      { onConflict: "player_id" }
    )
    .select("*")
    .single();
  if (streakErr) return res.status(500).json({ error: streakErr.message });

  const qById = Object.fromEntries((allQuestions || []).map((q) => [q.id, q]));
  const attemptById = Object.fromEntries((allAttempts || []).map((a) => [a.question_id, a]));

  const results = dailySet.question_ids.map((id) => {
    const q = qById[id];
    const a = attemptById[id];
    return {
      question_id: id,
      question: q.question,
      subject: q.subject,
      chapter: q.chapter,
      year: q.year,
      correct_option: q.correct_option,
      solution: q.solution,
      selected_option: a?.selected_option || null,
      is_correct: a?.is_correct || false,
    };
  });

  return res.status(200).json({
    done: true,
    streak: streakRow,
    results,
    score: results.filter((r) => r.is_correct).length,
    total: dailySet.question_ids.length,
  });
}
