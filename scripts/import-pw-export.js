#!/usr/bin/env node
// Imports a PW question-bank export (the "Query result" xlsx shape with
// columns qbgquestionid, question, option1..4, correctoptions, text_solution,
// class, subject, chapter, exam) into Supabase.
//
// Handles what the generic scripts/import-questions.js doesn't:
//   - question/option/solution fields are HTML with embedded <img> tags
//     and raw LaTeX (\( ... \) / \[ ... \]) from a Mathpix-style OCR pass
//   - correctoptions is "1".."4" (or comma-separated for multi-select,
//     which we skip — this app is single-select only)
//   - exam is a free-text label (NEET / JEE Mains / JEE Advanced / Board /
//     NDA / BITSAT / ...) that needs mapping down to our JEE/NEET buckets
//   - the PYQ year lives inside a trailing "[NEET 2024]"-style tag in the
//     question text, not its own column
//
// Usage:
//   npm run import-pw-export -- ./query_result.xlsx

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const katex = require("katex");
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
  console.error("Usage: npm run import-pw-export -- ./query_result.xlsx");
  process.exit(1);
}

// ---- HTML entity decoding -------------------------------------------
// Source cells sometimes carry entity-encoded ampersands ("&amp;") inside
// LaTeX array/matrix column separators, which katex can't interpret
// literally as "&". This must run ONLY on the extracted math substring
// (inside renderOne), never on the whole HTML string — decoding globally
// turns math comparisons like "x<\pi" into a literal "<" that the tag
// sanitizer then misreads as the start of an HTML tag, silently eating
// everything up to the next unrelated ">" in the document.
const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };

function decodeEntities(str) {
  if (!str) return "";
  return String(str).replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (full, code) => {
    if (code[0] === "#") {
      const num = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(num) ? String.fromCodePoint(num) : full;
    }
    return NAMED_ENTITIES[code] !== undefined ? NAMED_ENTITIES[code] : full;
  });
}

// ---- HTML sanitization -----------------------------------------------
// Source content is PW's own trusted question bank, not arbitrary user
// input — but we still allowlist tags/attributes rather than trusting the
// export blindly, since this HTML gets stored and later rendered as-is.
const ALLOWED_TAGS = new Set(["p", "br", "strong", "em", "b", "i", "sup", "sub", "ul", "ol", "li", "img", "span"]);

function sanitizeHtml(html) {
  if (!html) return "";
  return String(html).replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (full, tag, attrs) => {
    const lower = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(lower)) return "";
    const closing = full.startsWith("</");
    if (closing) return `</${lower}>`;
    if (lower === "img") {
      const srcMatch = attrs.match(/src\s*=\s*"([^"]*)"/i);
      const src = srcMatch ? srcMatch[1] : "";
      if (!/^https:\/\//i.test(src)) return "";
      const altMatch = attrs.match(/alt\s*=\s*"([^"]*)"/i);
      const alt = altMatch ? altMatch[1].replace(/"/g, "&quot;") : "";
      // If the image fails to load (dead CDN link, network hiccup), hide it
      // rather than showing a broken-image icon in the middle of a question.
      return `<img src="${src}" alt="${alt}" loading="lazy" onerror="this.style.display='none'" />`;
    }
    return `<${lower}>`;
  });
}

// ---- LaTeX rendering ----------------------------------------------------
// \( ... \) => inline math, \[ ... \] => display math. Runs after
// sanitizeHtml so we're operating on a safe string; katex output itself is
// well-formed HTML we trust (it's a well-known rendering library).
function renderMath(html) {
  let out = html.replace(/\\\[([\s\S]+?)\\\]/g, (_, expr) => renderOne(expr, true));
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_, expr) => renderOne(expr, false));
  return out;
}

// Detects LaTeX commands that never got wrapped in \( \) / \[ \] in the
// source, so they'd show up as raw "\begin{aligned}\vec{F}=..." text
// instead of rendered math. A small slice of rows have this data-quality
// issue upstream — with thousands of clean questions to spare, we skip
// these rather than risk a fragile auto-wrap heuristic.
function hasUnrenderedLatex(html) {
  const outsideKatex = html.replace(/<span class="katex[\s\S]*?<\/span><\/span>/g, "");
  return /\\(begin|vec|frac|left|right)\{/.test(outsideKatex);
}

function renderOne(expr, displayMode) {
  // Decode entities within the math substring only (see note above), then
  // swap any stray literal "<br>" Mathpix left behind for a LaTeX row break.
  const cleanExpr = decodeEntities(expr).replace(/<\s*br\s*\/?>/gi, "\\\\");
  try {
    return katex.renderToString(cleanExpr.trim(), { throwOnError: false, displayMode });
  } catch {
    return cleanExpr;
  }
}

// ---- Year / exam-tag extraction -----------------------------------------
// Finds the last "[... 20xx ...]" bracket, pulls the year out, and strips
// the bracket from the displayed text (we show the year as its own badge).
function extractYearAndClean(rawHtml) {
  const matches = [...rawHtml.matchAll(/\[[^\]]*\b((?:19|20)\d{2})\b[^\]]*\]/g)];
  if (matches.length === 0) return { year: null, cleaned: rawHtml };
  const last = matches[matches.length - 1];
  const year = parseInt(last[1], 10);
  const cleaned = rawHtml.slice(0, last.index) + rawHtml.slice(last.index + last[0].length);
  return { year, cleaned };
}

function processField(rawHtml) {
  return renderMath(sanitizeHtml(rawHtml));
}

// ---- exam mapping ---------------------------------------------------
function mapExams(examRaw, subject) {
  const e = String(examRaw || "").trim();
  if (/^NEET/i.test(e)) return ["NEET"];
  if (/^JEE/i.test(e)) return ["JEE"];
  if (!e) {
    if (subject === "Zoology" || subject === "Botany") return ["NEET"];
    if (subject === "Maths") return ["JEE"];
    if (subject === "Physics" || subject === "Chemistry") return ["JEE", "NEET"];
    return [];
  }
  return []; // Board / NDA / BITSAT / AIIMS / VITEEE / MHT CET — out of scope
}

const OPTION_LETTERS = { 1: "A", 2: "B", 3: "C", 4: "D" };
// Source data only ever has 1 (easy) or 2 (medium) — no "hard" seen.
const DIFFICULTY_LEVELS = { 1: "easy", 2: "medium" };

async function main() {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  console.log(`Read ${rows.length} rows from ${path.basename(filePath)}`);

  const questions = [];
  let skippedMulti = 0;
  let skippedExam = 0;
  let skippedIncomplete = 0;
  let skippedMalformedLatex = 0;

  for (const row of rows) {
    const correctRaw = String(row.correctoptions || "").trim();
    if (correctRaw.includes(",") || !OPTION_LETTERS[correctRaw]) {
      skippedMulti += 1;
      continue;
    }
    const klass = String(row.class || "").trim();
    if (klass !== "11" && klass !== "12") {
      skippedIncomplete += 1;
      continue;
    }
    const exams = mapExams(row.exam, row.subject);
    if (exams.length === 0) {
      skippedExam += 1;
      continue;
    }

    const { year, cleaned: questionNoTag } = extractYearAndClean(String(row.question || ""));
    const question = processField(questionNoTag);
    const option_a = processField(row.option1);
    const option_b = processField(row.option2);
    const option_c = processField(row.option3);
    const option_d = processField(row.option4);
    const solution = processField(row.text_solution);

    if (!question || !option_a || !option_b || !option_c || !option_d) {
      skippedIncomplete += 1;
      continue;
    }

    if (
      hasUnrenderedLatex(question) ||
      hasUnrenderedLatex(solution || "") ||
      [option_a, option_b, option_c, option_d].some(hasUnrenderedLatex)
    ) {
      skippedMalformedLatex += 1;
      continue;
    }

    const correct_option = OPTION_LETTERS[correctRaw];
    const difficulty = DIFFICULTY_LEVELS[String(row.difficulty || "").trim()] || null;

    for (const exam of exams) {
      questions.push({
        exam,
        class: klass,
        subject: row.subject || null,
        chapter: row.chapter || null,
        year: Number.isFinite(year) ? year : null,
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option,
        solution: solution || null,
        difficulty,
      });
    }
  }

  console.log(
    `\nSkipped: ${skippedMulti} multi-answer, ${skippedExam} non-JEE/NEET exam, ${skippedIncomplete} incomplete/other-class, ${skippedMalformedLatex} malformed LaTeX (missing delimiters in source)`
  );
  console.log(`Prepared ${questions.length} question rows to insert (some duplicated across JEE+NEET when the source exam was blank).`);

  if (questions.length === 0) {
    console.error("Nothing to import.");
    process.exit(1);
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

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

  const counts = {};
  for (const q of questions) {
    const key = `${q.exam} · Class ${q.class}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  console.log("\nDone. Breakdown:");
  Object.entries(counts).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
