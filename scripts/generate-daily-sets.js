#!/usr/bin/env node
// Pre-generates and saves the daily_sets rows for every day of the
// campaign (today through CHALLENGE_END_DATE) for every class+exam group,
// so the question schedule exists as auditable rows in Supabase rather
// than being created lazily on first request each day.
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

const CHALLENGE_END_DATE = "2026-08-17";
const CLASSES = ["11", "12", "dropper"];
const EXAMS = ["JEE", "NEET"];

// Mirrors lib/priority-chapters.js — keep in sync if that file changes.
const PRIORITY_CHAPTERS = {
  "11|Physics": ["Units and Measurements", "Mathematical Tools and Vectors", "Motion in a Straight Line", "Motion in a Plane", "Laws of Motion", "Work, Energy and Power", "Circular Motion", "Center of Mass and System of Particles", "Rotational Motion", "Gravitation"],
  "11|Chemistry": ["Some Basic Concepts of Chemistry", "Structure of Atom", "Classification of Elements and Periodicity in Properties", "Chemical Bonding and Molecular Structure", "States of Matter", "Organic Chemistry: Some Basic Principles and Techniques"],
  "11|Maths": ["Basic Maths", "Sets", "Relations and Functions", "Trigonometric Functions", "Quadratic Equations", "Complex Numbers and Quadratic Equations", "Permutations and Combinations", "Binomial Theorem", "Sequence and Series", "Straight Lines"],
  "11|Botany": ["The Living World", "Biological Classification", "Plant Kingdom", "Morphology of Flowering Plants", "Anatomy of Flowering Plants", "Cell: The Unit of Life", "Biomolecules", "Cell Cycle and Cell Division"],
  "11|Zoology": ["Animal Kingdom", "Structural Organisation in Animals (Animal Tissues)"],
  "12|Physics": ["Electric Charges and Fields", "Electrostatic Potential and Capacitance", "Current Electricity", "Moving Charges and Magnetism", "Magnetism and Matter", "Electromagnetic Induction"],
  "12|Chemistry": ["The Solid State", "Solutions", "Electrochemistry", "Chemical Kinetics", "General Principles and Processes of Isolation of Elements", "The P-Block Elements (XII)", "The D and F-Block Elements", "Coordination Compounds"],
  "12|Maths": ["Relations and Functions", "Inverse Trigonometric Functions", "Matrices", "Determinants", "Continuity and Differentiability", "Application of Derivatives"],
  "12|Botany": ["Sexual Reproduction in Flowering Plants", "Principles of Inheritance and Variation", "Molecular Basis of Inheritance"],
  "12|Zoology": ["Human Reproduction", "Reproductive Health"],
};

function isPriorityChapter(klass, subject, chapter) {
  const list = PRIORITY_CHAPTERS[`${klass}|${subject}`];
  return list ? list.includes(chapter) : false;
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

async function ensureDailySet(setDate, klass, exam, poolCache, usedCache) {
  const { data: existing } = await db
    .from("daily_sets")
    .select("*")
    .eq("set_date", setDate)
    .eq("class", klass)
    .eq("exam", exam)
    .maybeSingle();
  if (existing) return { row: existing, created: false };

  const poolClass = klass === "dropper" ? "12" : klass;
  const poolKey = `${poolClass}|${exam}`;
  if (!poolCache[poolKey]) {
    const { data: pool } = await db.from("questions").select("id, subject, chapter").eq("class", poolClass).eq("exam", exam);
    poolCache[poolKey] = pool || [];
  }
  const pool = poolCache[poolKey];

  const usedKey = `${klass}|${exam}`;
  if (!usedCache[usedKey]) usedCache[usedKey] = new Set();
  const usedIds = usedCache[usedKey];

  let candidates = pool.filter((q) => !usedIds.has(q.id));
  if (klass !== "dropper") {
    const priority = candidates.filter((q) => isPriorityChapter(klass, q.subject, q.chapter));
    if (priority.length >= 3) candidates = priority;
  }
  if (candidates.length < 3) candidates = pool;
  if (candidates.length === 0) {
    throw new Error(`No questions available for class=${klass} exam=${exam}`);
  }

  const seed = hashSeed(`${setDate}:${klass}:${exam}`);
  const shuffled = [...candidates].sort((a, b) => seededRand(a.id, seed) - seededRand(b.id, seed));
  const questionIds = shuffled.slice(0, 3).map((q) => q.id);
  questionIds.forEach((id) => usedIds.add(id));

  const { data: inserted, error } = await db
    .from("daily_sets")
    .upsert({ set_date: setDate, class: klass, exam, question_ids: questionIds }, { onConflict: "set_date,class,exam" })
    .select("*")
    .single();
  if (error) throw error;
  return { row: inserted, created: true };
}

async function main() {
  const start = todayIST();
  const dates = datesFrom(start, CHALLENGE_END_DATE);
  console.log(`Generating daily sets for ${dates.length} day(s): ${start} → ${CHALLENGE_END_DATE}`);

  const poolCache = {};
  const usedCache = {};
  let created = 0;
  let existed = 0;
  const failures = [];

  for (const date of dates) {
    for (const klass of CLASSES) {
      for (const exam of EXAMS) {
        try {
          const { created: wasCreated } = await ensureDailySet(date, klass, exam, poolCache, usedCache);
          if (wasCreated) created += 1;
          else existed += 1;
        } catch (e) {
          failures.push(`${date} ${klass}/${exam}: ${e.message}`);
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
