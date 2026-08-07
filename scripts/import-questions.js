#!/usr/bin/env node
// Imports the JEE/NEET PYQ question bank from an Excel file into Supabase.
//
// Usage:
//   npm run import-questions -- ./questions.xlsx
//
// Expected columns (case-insensitive, order doesn't matter):
//   exam           JEE | NEET
//   class          11 | 12 | dropper
//   subject        e.g. Physics
//   chapter        e.g. Kinematics
//   year           e.g. 2023
//   question       question text
//   option_a..d    the 4 options
//   correct_option A | B | C | D
//   solution       explanation text (optional)

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
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

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: npm run import-questions -- ./questions.xlsx");
  process.exit(1);
}

const VALID_CLASSES = ["11", "12", "dropper"];
const VALID_EXAMS = ["JEE", "NEET"];
const VALID_OPTIONS = ["A", "B", "C", "D"];

function normKey(k) {
  return String(k).trim().toLowerCase().replace(/\s+/g, "_");
}

function pick(row, ...keys) {
  const normalized = {};
  for (const k of Object.keys(row)) normalized[normKey(k)] = row[k];
  for (const k of keys) {
    if (normalized[k] !== undefined && normalized[k] !== "") return normalized[k];
  }
  return undefined;
}

async function main() {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  console.log(`Read ${rows.length} rows from ${path.basename(filePath)}`);

  const questions = [];
  const errors = [];

  rows.forEach((row, i) => {
    const lineNo = i + 2; // account for header row
    const exam = String(pick(row, "exam") || "").trim().toUpperCase();
    const klass = String(pick(row, "class") || "").trim().toLowerCase();
    const subject = String(pick(row, "subject") || "").trim();
    const chapter = String(pick(row, "chapter") || "").trim();
    const yearRaw = pick(row, "year");
    const year = yearRaw ? parseInt(yearRaw, 10) : null;
    const question = String(pick(row, "question", "question_text") || "").trim();
    const option_a = String(pick(row, "option_a", "optiona", "a") || "").trim();
    const option_b = String(pick(row, "option_b", "optionb", "b") || "").trim();
    const option_c = String(pick(row, "option_c", "optionc", "c") || "").trim();
    const option_d = String(pick(row, "option_d", "optiond", "d") || "").trim();
    const correct_option = String(pick(row, "correct_option", "correct", "answer") || "").trim().toUpperCase();
    const solution = String(pick(row, "solution", "explanation") || "").trim();

    const rowErrors = [];
    if (!VALID_EXAMS.includes(exam)) rowErrors.push(`invalid exam "${exam}"`);
    if (!VALID_CLASSES.includes(klass)) rowErrors.push(`invalid class "${klass}"`);
    if (!question) rowErrors.push("missing question");
    if (!option_a || !option_b || !option_c || !option_d) rowErrors.push("missing an option");
    if (!VALID_OPTIONS.includes(correct_option)) rowErrors.push(`invalid correct_option "${correct_option}"`);

    if (rowErrors.length > 0) {
      errors.push(`Line ${lineNo}: ${rowErrors.join(", ")}`);
      return;
    }

    questions.push({
      exam,
      class: klass,
      subject: subject || null,
      chapter: chapter || null,
      year: Number.isFinite(year) ? year : null,
      question,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_option,
      solution: solution || null,
    });
  });

  if (errors.length > 0) {
    console.warn(`\n${errors.length} row(s) skipped:`);
    errors.slice(0, 20).forEach((e) => console.warn(`  - ${e}`));
    if (errors.length > 20) console.warn(`  ... and ${errors.length - 20} more`);
  }

  if (questions.length === 0) {
    console.error("\nNo valid questions to import.");
    process.exit(1);
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  console.log(`\nInserting ${questions.length} valid questions...`);
  const chunkSize = 200;
  for (let i = 0; i < questions.length; i += chunkSize) {
    const chunk = questions.slice(i, i + chunkSize);
    const { error } = await db.from("questions").insert(chunk);
    if (error) {
      console.error(`Failed on chunk starting at row ${i}:`, error.message);
      process.exit(1);
    }
    console.log(`  inserted ${Math.min(i + chunkSize, questions.length)}/${questions.length}`);
  }

  console.log("\nDone. Breakdown by exam/class:");
  const counts = {};
  for (const q of questions) {
    const key = `${q.exam} · Class ${q.class}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  Object.entries(counts).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log(
    "\nNote: daily_sets are auto-created on first request each day, picking 3 unused questions per group — no extra step needed."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
