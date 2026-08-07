import { supabaseAdmin } from "../../lib/supabase";
import { ensureDailySet } from "../../lib/daily-set";
import { todayIST, isChallengeOpen } from "../../lib/campaign";

function prevDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Records one answer at a time (called the instant a user taps an option),
// so the UI can show right/wrong feedback immediately instead of waiting
// for all 3 questions. Streak updates once the 3rd answer of the day lands.
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
  if (!dailySet.question_ids.includes(question_id)) {
    return res.status(400).json({ error: "Question is not part of today's set" });
  }

  const { data: question, error: qErr } = await db
    .from("questions")
    .select("*")
    .eq("id", question_id)
    .single();
  if (qErr) return res.status(500).json({ error: qErr.message });

  const is_correct = selected_option === question.correct_option;

  const { error: insertErr } = await db.from("attempts").upsert(
    {
      player_id: player.id,
      question_id,
      class: klass,
      exam,
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

  let streak = null;
  let results = null;
  if (done) {
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

    const { data: allQuestions } = await db
      .from("questions")
      .select("*")
      .in("id", dailySet.question_ids);
    const qById = Object.fromEntries((allQuestions || []).map((q) => [q.id, q]));
    const attemptById = Object.fromEntries((allAttempts || []).map((a) => [a.question_id, a]));

    results = dailySet.question_ids.map((id) => {
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
  }

  return res.status(200).json({
    is_correct,
    correct_option: question.correct_option,
    solution: question.solution,
    done,
    streak,
    results,
    score: results ? results.filter((r) => r.is_correct).length : null,
    total: dailySet.question_ids.length,
  });
}
