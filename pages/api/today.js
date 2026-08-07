import { supabaseAdmin } from "../../lib/supabase";
import { ensureDailySet } from "../../lib/daily-set";
import { todayIST, isChallengeOpen } from "../../lib/campaign";

// Builds the results/streak payload for a player's most recently completed
// day — used both for "you already played today" and for "the challenge
// has ended, here's how your last day went" so people can always come back
// and check their solutions/rank, even after the challenge closes.
async function loadLastCompletedDay(db, player, klass, exam) {
  const { data: lastAttempt } = await db
    .from("attempts")
    .select("set_date")
    .eq("player_id", player.id)
    .eq("class", klass)
    .eq("exam", exam)
    .order("set_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!lastAttempt) return null;

  const { data: attempts } = await db
    .from("attempts")
    .select("question_id, selected_option, is_correct")
    .eq("player_id", player.id)
    .eq("set_date", lastAttempt.set_date)
    .eq("class", klass)
    .eq("exam", exam);
  if (!attempts || attempts.length === 0) return null;

  const questionIds = attempts.map((a) => a.question_id);
  const { data: fullQuestions } = await db.from("questions").select("*").in("id", questionIds);
  const qById = Object.fromEntries((fullQuestions || []).map((q) => [q.id, q]));
  const attemptById = Object.fromEntries(attempts.map((a) => [a.question_id, a]));

  const results = questionIds.map((id) => {
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

  const { data: streakRow } = await db.from("streaks").select("*").eq("player_id", player.id).maybeSingle();

  return { setDate: lastAttempt.set_date, results, streak: streakRow || null };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { class: klass, exam, device_id } = req.query;
  if (!klass || !exam) {
    return res.status(400).json({ error: "Missing class or exam" });
  }

  const setDate = todayIST();
  const db = supabaseAdmin();

  let player = null;
  if (device_id) {
    const { data: p } = await db.from("players").select("*").eq("device_id", device_id).maybeSingle();
    player = p || null;
  }

  if (!isChallengeOpen(setDate)) {
    let last = null;
    if (player) last = await loadLastCompletedDay(db, player, klass, exam);
    return res.status(200).json({
      challengeClosed: true,
      setDate,
      player,
      results: last?.results || null,
      score: last ? last.results.filter((r) => r.is_correct).length : null,
      total: last?.results.length || null,
      streak: last?.streak || null,
    });
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
  let results = null;
  let streak = null;

  if (player) {
    const { data: attempts } = await db
      .from("attempts")
      .select("question_id, selected_option, is_correct")
      .eq("player_id", player.id)
      .eq("set_date", setDate)
      .in("question_id", dailySet.question_ids);
    completed = (attempts || []).length >= orderedQuestions.length && orderedQuestions.length > 0;

    if (completed) {
      const attemptById = Object.fromEntries((attempts || []).map((a) => [a.question_id, a]));
      const { data: fullQuestions } = await db.from("questions").select("*").in("id", dailySet.question_ids);
      const qById = Object.fromEntries((fullQuestions || []).map((q) => [q.id, q]));

      results = dailySet.question_ids.map((id) => {
        const q = qById[id];
        const a = attemptById[id];
        return {
          question_id: id,
          question: q.question,
          chapter: q.chapter,
          year: q.year,
          correct_option: q.correct_option,
          solution: q.solution,
          selected_option: a?.selected_option || null,
          is_correct: a?.is_correct || false,
        };
      });

      const { data: streakRow } = await db.from("streaks").select("*").eq("player_id", player.id).maybeSingle();
      streak = streakRow || null;
    }
  }

  return res.status(200).json({
    setDate,
    questions: orderedQuestions,
    completed,
    player,
    results,
    score: results ? results.filter((r) => r.is_correct).length : null,
    total: orderedQuestions.length,
    streak,
  });
}
