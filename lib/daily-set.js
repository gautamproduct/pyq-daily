import { supabaseAdmin } from "./supabase";
import { isPriorityChapter, poolClassesFor } from "./priority-chapters";

// Every day's 3 questions are one-per-subject — PCM for JEE, PCB for NEET —
// so a single day never skews toward one subject. "Biology" draws from
// either Botany or Zoology, since the source data keeps those separate.
const REQUIRED_SUBJECTS = {
  JEE: [
    { slot: "Physics", subjects: ["Physics"] },
    { slot: "Chemistry", subjects: ["Chemistry"] },
    { slot: "Maths", subjects: ["Maths"] },
  ],
  NEET: [
    { slot: "Physics", subjects: ["Physics"] },
    { slot: "Chemistry", subjects: ["Chemistry"] },
    { slot: "Biology", subjects: ["Botany", "Zoology"] },
  ],
};

// A question is "render-safe" if its stored HTML has nothing that tends to
// render badly on a phone: no images (dead CDN links, huge diagrams), no
// katex matrices/arrays/cases (mtable), no display-math blocks, no tables.
// Biasing toward these keeps the daily set clean and low-maintenance.
export function isRenderSafe(q) {
  const all = [q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.solution || ""].join(" ");
  if (/<img/i.test(all)) return false;
  if (/mtable/.test(all)) return false; // katex matrices / arrays / cases
  if (/katex-display/.test(all)) return false; // \[ ... \] display blocks
  if (/<table/i.test(all)) return false;
  return true;
}

const POOL_COLUMNS =
  "id, class, subject, chapter, difficulty, question, option_a, option_b, option_c, option_d, solution";

// Returns the daily_sets row for (date, class, exam), creating it on first
// request of the day by picking one question per subject, biased toward
// initial NCERT chapters, render-safe content, and a 2-easy/1-medium mix.
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
  const usedIds = new Set((usedRows || []).flatMap((r) => r.question_ids || []));

  // Droppers draw from both class 11 and 12 (they've done the full syllabus);
  // everyone else from their own class.
  const poolClasses = poolClassesFor(klass);

  const { data: pool, error: poolErr } = await db
    .from("questions")
    .select(POOL_COLUMNS)
    .in("class", poolClasses)
    .eq("exam", exam);
  if (poolErr) throw poolErr;
  if (!pool || pool.length === 0) {
    throw new Error(`No questions available for class=${klass} exam=${exam}. Import the question bank first.`);
  }

  const questionIds = pickDailyQuestions(pool, klass, exam, setDate, usedIds);
  if (questionIds.length === 0) {
    throw new Error(`No questions available for class=${klass} exam=${exam}. Import the question bank first.`);
  }

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

// Pure selection logic — shared shape with scripts/generate-daily-sets.js.
// `usedIds` is the set of question ids already spent by this group on prior
// days so the same question never repeats across the campaign.
export function pickDailyQuestions(pool, klass, exam, setDate, usedIds) {
  const slots = REQUIRED_SUBJECTS[exam];
  const seed = hashSeed(`${setDate}:${klass}:${exam}`);
  // Two "easy" slots + one "medium" slot per day; which subject is the
  // medium one rotates deterministically by day.
  const mediumSlotIndex = Math.abs(seed) % slots.length;

  const picked = [];
  const pickedIds = new Set();

  slots.forEach((slot, i) => {
    const wantDifficulty = i === mediumSlotIndex ? "medium" : "easy";
    const q = pickOne(pool, slot.subjects, wantDifficulty, klass, usedIds, pickedIds, seed, slot.slot);
    if (q) {
      picked.push(q);
      pickedIds.add(q.id);
    }
  });

  // If a subject slot came up empty, fill from anything unused rather than
  // shipping fewer than 3 questions.
  if (picked.length < slots.length) {
    let fallback = pool.filter((q) => !usedIds.has(q.id) && !pickedIds.has(q.id));
    if (fallback.length < slots.length - picked.length) fallback = pool.filter((q) => !pickedIds.has(q.id));
    for (const q of seededShuffle(fallback, seed)) {
      if (picked.length >= slots.length) break;
      picked.push(q);
      pickedIds.add(q.id);
    }
  }

  return picked.slice(0, 3).map((q) => q.id);
}

// Tiered narrowing: each preference is only applied if it leaves at least one
// candidate, so we always fill the slot but stay on the best available tier.
// Order of importance: subject > fresh > render-safe > initial-chapter >
// difficulty. Render-safety sits high on purpose — a clean phone render
// matters more than hitting the exact chapter or easy/medium target on a
// thin subject, so a thin slot pulls a clean question from an adjacent early
// chapter rather than a matrix-heavy one from the first three.
function pickOne(pool, subjects, wantDifficulty, klass, usedIds, pickedIds, seed, saltKey) {
  const inSubject = pool.filter((q) => subjects.includes(q.subject) && !pickedIds.has(q.id));
  if (inSubject.length === 0) return null;

  let candidates = narrow(inSubject, (q) => !usedIds.has(q.id)); // prefer fresh (no repeats)
  candidates = narrow(candidates, isRenderSafe); // then clean-rendering
  candidates = narrow(candidates, (q) => isPriorityChapter(klass, q.subject, q.chapter)); // then initial chapters
  candidates = narrow(candidates, (q) => q.difficulty === wantDifficulty); // then difficulty target

  return seededShuffle(candidates, hashSeed(`${seed}:${saltKey}`))[0];
}

// Return the subset matching `pred`, but only if that keeps ≥1 candidate;
// otherwise keep the wider set (the preference couldn't be satisfied).
function narrow(candidates, pred) {
  const filtered = candidates.filter(pred);
  return filtered.length > 0 ? filtered : candidates;
}

function seededShuffle(arr, seed) {
  return [...arr].sort((a, b) => seededRand(a.id, seed) - seededRand(b.id, seed));
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
