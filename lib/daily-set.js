import { supabaseAdmin } from "./supabase";
import { isPriorityChapter, poolClassesFor } from "./priority-chapters";
import { questionsPerDay } from "./variant";

// The subject rotation for one "lap" — PCM for JEE, PCB for NEET (Biology
// draws from either Botany or Zoology). Longer daily sets (the q8 variant)
// just repeat this rotation round-robin until they hit the target count, so
// every day still stays subject-balanced regardless of how many questions
// it has.
const SUBJECT_ROTATION = {
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

function buildSlots(exam, count) {
  const rotation = SUBJECT_ROTATION[exam];
  const slots = [];
  for (let i = 0; i < count; i++) {
    slots.push(rotation[i % rotation.length]);
  }
  return slots;
}

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

// Returns the daily_sets row for (date, class, exam, variant), creating it
// on first request of the day by picking one question per subject slot
// (round-robin, `questionsPerDay(variant)` slots total), biased toward
// initial NCERT chapters, render-safe content, and a ~2:1 easy:medium mix.
// Each variant tracks its own freshness — a q3 player and a q8 player can
// see the same question on the same day, that's fine; they're independent
// experiment arms, not one shared pool.
export async function ensureDailySet(setDate, klass, exam, variant = "q3") {
  const db = supabaseAdmin();
  const count = questionsPerDay(variant);

  const { data: existing, error: existingErr } = await db
    .from("daily_sets")
    .select("*")
    .eq("set_date", setDate)
    .eq("class", klass)
    .eq("exam", exam)
    .eq("variant", variant)
    .maybeSingle();

  if (existingErr) throw existingErr;
  if (existing) return existing;

  // q8 shares its first 3 questions with q3 for the same day (same class +
  // exam), so the two experiment arms are directly comparable on those
  // questions — q8 just adds more on top. This recurses one level (q8 ->
  // q3) and is safe: q3 never depends on q8, so there's no cycle.
  let prefixIds = [];
  if (variant === "q8") {
    const q3Set = await ensureDailySet(setDate, klass, exam, "q3");
    prefixIds = q3Set.question_ids.slice(0, 3);
  }

  const { data: usedRows, error: usedErr } = await db
    .from("daily_sets")
    .select("question_ids")
    .eq("class", klass)
    .eq("exam", exam)
    .eq("variant", variant);
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

  const questionIds = pickDailyQuestions(pool, klass, exam, setDate, usedIds, count, prefixIds);
  if (questionIds.length === 0) {
    throw new Error(`No questions available for class=${klass} exam=${exam}. Import the question bank first.`);
  }

  const { data: inserted, error: insertErr } = await db
    .from("daily_sets")
    .upsert(
      { set_date: setDate, class: klass, exam, variant, question_ids: questionIds },
      { onConflict: "set_date,class,exam,variant" }
    )
    .select("*")
    .single();
  if (insertErr) throw insertErr;
  return inserted;
}

// Pure selection logic — shared shape with scripts/generate-daily-sets.js.
// `usedIds` is the set of question ids already spent by this (class, exam,
// variant) group on prior days so the same question never repeats across
// the campaign. `count` is how many questions to pick (3 for q3, 8 for q8).
// `prefixIds` (q8 only) forces the first N picks to be exactly q3's
// question ids for the same day, in order — everything after that is
// picked normally, continuing the subject rotation from that point.
export function pickDailyQuestions(pool, klass, exam, setDate, usedIds, count, prefixIds = []) {
  const slots = buildSlots(exam, count);
  const seed = hashSeed(`${setDate}:${klass}:${exam}:${count}`);
  const mediumIndices = pickMediumSlotIndices(count, seed);

  const picked = [];
  const pickedIds = new Set();

  const byId = new Map(pool.map((q) => [q.id, q]));
  prefixIds.forEach((id) => {
    const q = byId.get(id);
    if (q) {
      picked.push(q);
      pickedIds.add(id);
    }
  });

  slots.forEach((slot, i) => {
    if (i < picked.length) return; // already filled from the prefix
    const wantDifficulty = mediumIndices.has(i) ? "medium" : "easy";
    const q = pickOne(pool, slot.subjects, wantDifficulty, klass, usedIds, pickedIds, seed, `${slot.slot}-${i}`);
    if (q) {
      picked.push(q);
      pickedIds.add(q.id);
    }
  });

  // If a subject slot came up empty, fill from anything unused rather than
  // shipping fewer than `count` questions.
  if (picked.length < slots.length) {
    let fallback = pool.filter((q) => !usedIds.has(q.id) && !pickedIds.has(q.id));
    if (fallback.length < slots.length - picked.length) fallback = pool.filter((q) => !pickedIds.has(q.id));
    for (const q of seededShuffle(fallback, seed)) {
      if (picked.length >= slots.length) break;
      picked.push(q);
      pickedIds.add(q.id);
    }
  }

  return picked.slice(0, count).map((q) => q.id);
}

// Deterministically picks which slot indices are "medium" — roughly 1-in-3,
// same ratio the original 3-question days used (1 medium, 2 easy), just
// scaled to however many slots this variant has.
function pickMediumSlotIndices(count, seed) {
  const mediumCount = Math.max(1, Math.round(count / 3));
  const order = Array.from({ length: count }, (_, i) => i).sort(
    (a, b) => seededRand(a, seed) - seededRand(b, seed)
  );
  return new Set(order.slice(0, mediumCount));
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
