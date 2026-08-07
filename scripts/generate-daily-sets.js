#!/usr/bin/env node
// Pre-generates and saves the daily_sets rows for every day of the
// campaign (today through CHALLENGE_END_DATE), for every class+exam+variant
// group, so the question schedule exists as auditable rows in Supabase
// rather than being created lazily on first request each day.
//
// Mirrors lib/daily-set.js + lib/priority-chapters.js + lib/variant.js — keep
// them in sync if the algorithm changes. (This is CommonJS and can't import
// the ESM libs.)
//
// Usage: npm run generate-daily-sets

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (set them in .env.local)");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const CHALLENGE_END_DATE = "2026-08-20";
const CLASSES = ["11", "12", "dropper"];
const EXAMS = ["JEE", "NEET"];
// Mirrors lib/variant.js — keep in sync.
const VARIANTS = { q3: 3, q8: 8 };

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
  for (let i = 0; i < count; i++) slots.push(rotation[i % rotation.length]);
  return slots;
}

// Mirrors lib/priority-chapters.js — keep in sync.
const INITIAL_CHAPTERS = {
  "11|Physics": ["Units and Measurements", "Motion in a Straight Line", "Motion in a Plane"],
  "11|Chemistry": ["Some Basic Concepts of Chemistry", "Structure of Atom", "Classification of Elements and Periodicity in Properties"],
  "11|Maths": ["Relations and Functions", "Trigonometric Functions", "Complex Numbers and Quadratic Equations"],
  "11|Botany": ["The Living World", "Biological Classification", "Plant Kingdom"],
  "11|Zoology": ["Animal Kingdom", "Structural Organisation in Animals (Animal Tissues)", "Biomolecules"],
  "12|Physics": ["Electric Charges and Fields", "Electrostatic Potential and Capacitance", "Current Electricity"],
  "12|Chemistry": ["The Solid State", "Solutions", "Electrochemistry"],
  "12|Maths": ["Relations and Functions", "Inverse Trigonometric Functions", "Matrices"],
  "12|Botany": ["Sexual Reproduction in Flowering Plants", "Principles of Inheritance and Variation", "Molecular Basis of Inheritance"],
  "12|Zoology": ["Human Reproduction", "Reproductive Health", "Human Health and Disease"],
};

function poolClassesFor(klass) {
  return klass === "dropper" ? ["11", "12"] : [klass];
}
function isPriorityChapter(klass, subject, chapter) {
  return poolClassesFor(klass).some((c) => (INITIAL_CHAPTERS[`${c}|${subject}`] || []).includes(chapter));
}
function isRenderSafe(q) {
  const all = [q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.solution || ""].join(" ");
  if (/<img/i.test(all)) return false;
  if (/mtable/.test(all)) return false;
  if (/katex-display/.test(all)) return false;
  if (/<table/i.test(all)) return false;
  return true;
}

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h;
}
function seededRand(id, seed) {
  const str = `${id}:${seed}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h % 100000);
}
function seededShuffle(arr, seed) {
  return [...arr].sort((a, b) => seededRand(a.id, seed) - seededRand(b.id, seed));
}
function narrow(candidates, pred) {
  const filtered = candidates.filter(pred);
  return filtered.length > 0 ? filtered : candidates;
}
function pickMediumSlotIndices(count, seed) {
  const mediumCount = Math.max(1, Math.round(count / 3));
  const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => seededRand(a, seed) - seededRand(b, seed));
  return new Set(order.slice(0, mediumCount));
}

function pickOne(pool, subjects, wantDifficulty, klass, usedIds, pickedIds, seed, saltKey) {
  const inSubject = pool.filter((q) => subjects.includes(q.subject) && !pickedIds.has(q.id));
  if (inSubject.length === 0) return null;
  // Order: fresh > render-safe > initial-chapter > difficulty (see lib/daily-set.js).
  let candidates = narrow(inSubject, (q) => !usedIds.has(q.id));
  candidates = narrow(candidates, isRenderSafe);
  candidates = narrow(candidates, (q) => isPriorityChapter(klass, q.subject, q.chapter));
  candidates = narrow(candidates, (q) => q.difficulty === wantDifficulty);
  return seededShuffle(candidates, hashSeed(`${seed}:${saltKey}`))[0];
}

const POOL_COLUMNS = "id, class, subject, chapter, difficulty, question, option_a, option_b, option_c, option_d, solution";

function todayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 + now.getTimezoneOffset()) * 60000);
  return ist.toISOString().slice(0, 10);
}

function datesFrom(start, end) {
  const dates = [];
  let d = new Date(`${start}T00:00:00Z`);
  const endD = new Date(`${end}T00:00:00Z`);
  while (d <= endD) {
    dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

async function ensureDailySet(setDate, klass, exam, variant, poolCache, usedCache) {
  const count = VARIANTS[variant];

  const { data: existing } = await db
    .from("daily_sets")
    .select("*")
    .eq("set_date", setDate)
    .eq("class", klass)
    .eq("exam", exam)
    .eq("variant", variant)
    .maybeSingle();
  if (existing) return { row: existing, created: false };

  const poolClasses = poolClassesFor(klass);
  const poolKey = `${poolClasses.join("+")}|${exam}`;
  if (!poolCache[poolKey]) {
    const { data: pool } = await db.from("questions").select(POOL_COLUMNS).in("class", poolClasses).eq("exam", exam);
    poolCache[poolKey] = pool || [];
  }
  const pool = poolCache[poolKey];
  if (pool.length === 0) throw new Error(`No questions available for class=${klass} exam=${exam}`);

  const usedKey = `${klass}|${exam}|${variant}`;
  if (!usedCache[usedKey]) usedCache[usedKey] = new Set();
  const usedIds = usedCache[usedKey];

  const slots = buildSlots(exam, count);
  const seed = hashSeed(`${setDate}:${klass}:${exam}:${count}`);
  const mediumIndices = pickMediumSlotIndices(count, seed);

  const picked = [];
  const pickedIds = new Set();
  slots.forEach((slot, i) => {
    const wantDifficulty = mediumIndices.has(i) ? "medium" : "easy";
    const q = pickOne(pool, slot.subjects, wantDifficulty, klass, usedIds, pickedIds, seed, `${slot.slot}-${i}`);
    if (q) {
      picked.push(q);
      pickedIds.add(q.id);
    }
  });

  if (picked.length < slots.length) {
    let fallback = pool.filter((q) => !usedIds.has(q.id) && !pickedIds.has(q.id));
    if (fallback.length < slots.length - picked.length) fallback = pool.filter((q) => !pickedIds.has(q.id));
    for (const q of seededShuffle(fallback, seed)) {
      if (picked.length >= slots.length) break;
      picked.push(q);
      pickedIds.add(q.id);
    }
  }

  const questionIds = picked.slice(0, count).map((q) => q.id);
  if (questionIds.length === 0) throw new Error(`No questions available for class=${klass} exam=${exam}`);
  questionIds.forEach((id) => usedIds.add(id));

  const { data: inserted, error } = await db
    .from("daily_sets")
    .upsert(
      { set_date: setDate, class: klass, exam, variant, question_ids: questionIds },
      { onConflict: "set_date,class,exam,variant" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return { row: inserted, created: true };
}

async function main() {
  const start = todayIST();
  const dates = datesFrom(start, CHALLENGE_END_DATE);
  const variants = Object.keys(VARIANTS);
  console.log(
    `Generating daily sets for ${dates.length} day(s) x ${variants.length} variant(s): ${start} → ${CHALLENGE_END_DATE}`
  );

  const poolCache = {};
  // Pre-seed usedCache from EVERY existing daily_sets row, not just what
  // this run creates — otherwise an incremental run (extending the
  // campaign, or regenerating a handful of cleared slots) starts blind to
  // what earlier runs already picked and can reintroduce repeats into days
  // it never even touched this time. (lib/daily-set.js's live ensureDailySet
  // already does this correctly by querying the DB fresh every call; this
  // script's whole-run cache needed the same seeding.)
  const usedCache = {};
  {
    const { data: existingSets } = await db.from("daily_sets").select("class,exam,variant,question_ids");
    for (const row of existingSets || []) {
      const key = `${row.class}|${row.exam}|${row.variant}`;
      if (!usedCache[key]) usedCache[key] = new Set();
      for (const id of row.question_ids || []) usedCache[key].add(id);
    }
  }
  let created = 0;
  let existed = 0;
  const failures = [];

  for (const date of dates) {
    for (const klass of CLASSES) {
      for (const exam of EXAMS) {
        for (const variant of variants) {
          try {
            const { created: wasCreated } = await ensureDailySet(date, klass, exam, variant, poolCache, usedCache);
            if (wasCreated) created += 1;
            else existed += 1;
          } catch (e) {
            failures.push(`${date} ${klass}/${exam}/${variant}: ${e.message}`);
          }
        }
      }
    }
  }

  console.log(`\nCreated ${created} new daily sets, ${existed} already existed.`);
  if (failures.length > 0) {
    console.log(`\n${failures.length} failure(s):`);
    failures.forEach((f) => console.log("  -", f));
  } else {
    console.log("All groups covered for every day through", CHALLENGE_END_DATE);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
