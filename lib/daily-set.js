import { supabaseAdmin } from "./supabase";
import { isPriorityChapter } from "./priority-chapters";

// Returns the daily_sets row for (date, class, exam), creating it on first
// request of the day by picking 3 not-yet-used questions for that group.
// All players in the same group see the same 3 questions on the same day.
export async function ensureDailySet(setDate, klass, exam) {
  const db = supabaseAdmin();

  const { data: existing, error: existingErr } = await db
    .from("daily_sets")
    .select("*")
    .eq("set_date", setDate)
    .eq("class", klass)
    .eq("exam", exam)
    .maybeSingle();

  if (existingErr) throw existingErr;
  if (existing) return existing;

  const { data: usedRows, error: usedErr } = await db
    .from("daily_sets")
    .select("question_ids")
    .eq("class", klass)
    .eq("exam", exam);
  if (usedErr) throw usedErr;

  const usedIds = new Set(
    (usedRows || []).flatMap((r) => r.question_ids || [])
  );

  // Droppers have already covered the full syllabus once, so they draw from
  // the class-12 pool with no chapter restriction. 11/12 students draw only
  // from their own class's question bank.
  const poolClass = klass === "dropper" ? "12" : klass;

  const { data: pool, error: poolErr } = await db
    .from("questions")
    .select("id, subject, chapter")
    .eq("class", poolClass)
    .eq("exam", exam);
  if (poolErr) throw poolErr;

  let candidates = (pool || []).filter((q) => !usedIds.has(q.id));

  // Bias toward chapters already taught by this point in the school year —
  // a "PYQ from a chapter you haven't studied yet" is just noise, not
  // practice. Droppers skip this since they've covered everything.
  if (klass !== "dropper") {
    const priorityCandidates = candidates.filter((q) =>
      isPriorityChapter(klass, q.subject, q.chapter)
    );
    if (priorityCandidates.length >= 3) candidates = priorityCandidates;
  }

  // Ran out of fresh questions — allow repeats rather than breaking the day.
  if (candidates.length < 3) candidates = pool || [];
  if (candidates.length === 0) {
    throw new Error(
      `No questions available for class=${klass} exam=${exam}. Import the question bank first.`
    );
  }

  // Deterministic shuffle seeded by the date, so a race between two
  // simultaneous first-requests still picks the same 3 questions.
  const seed = hashSeed(`${setDate}:${klass}:${exam}`);
  const shuffled = [...candidates].sort(
    (a, b) => seededRand(a.id, seed) - seededRand(b.id, seed)
  );
  const questionIds = shuffled.slice(0, 3).map((q) => q.id);

  const { data: inserted, error: insertErr } = await db
    .from("daily_sets")
    .upsert(
      { set_date: setDate, class: klass, exam, question_ids: questionIds },
      { onConflict: "set_date,class,exam" }
    )
    .select("*")
    .single();
  if (insertErr) throw insertErr;
  return inserted;
}

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return h;
}

function seededRand(id, seed) {
  const str = `${id}:${seed}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h % 100000);
}
