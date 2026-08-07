#!/usr/bin/env node
// Read-only QA over the generated daily_sets: subject balance, difficulty
// mix, render-safety, initial-chapter adherence, and no repeats per group.
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const envPath = path.join(__dirname, "..", ".env.local");
fs.readFileSync(envPath, "utf8").split("\n").forEach((l) => {
  const t = l.trim(); if (!t || t.startsWith("#")) return;
  const i = t.indexOf("="); if (i > -1) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
});
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const INITIAL = {
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
function renderSafe(q) {
  const all = [q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.solution || ""].join(" ");
  return !/<img/i.test(all) && !/mtable/.test(all) && !/katex-display/.test(all) && !/<table/i.test(all);
}
function poolClasses(k){return k==="dropper"?["11","12"]:[k];}
function isInitial(k,s,c){return poolClasses(k).some(cl=>(INITIAL[`${cl}|${s}`]||[]).includes(c));}

(async () => {
  const { data: sets } = await db.from("daily_sets").select("*").order("set_date");
  const ids = [...new Set(sets.flatMap(s => s.question_ids))];
  let qs = [];
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await db.from("questions").select("*").in("id", ids.slice(i, i + 150));
    if (error) { console.error("fetch error:", error.message); process.exit(1); }
    qs = qs.concat(data || []);
  }
  const byId = Object.fromEntries(qs.map(q => [q.id, q]));

  const groups = {};
  for (const s of sets) {
    const g = `${s.class}|${s.exam}|${s.variant}`;
    (groups[g] = groups[g] || []).push(s);
  }
  let problems = 0;
  for (const g of Object.keys(groups).sort()) {
    const rows = groups[g];
    const seen = new Set();
    let dupes = 0, offChapter = 0, unsafe = 0, easy = 0, med = 0, other = 0, total = 0;
    const subjCount = {};
    for (const r of rows) {
      for (const id of r.question_ids) {
        const q = byId[id];
        total++;
        if (seen.has(id)) dupes++; seen.add(id);
        subjCount[q.subject] = (subjCount[q.subject] || 0) + 1;
        if (!isInitial(r.class, q.subject, q.chapter)) offChapter++;
        if (!renderSafe(q)) unsafe++;
        if (q.difficulty === "easy") easy++; else if (q.difficulty === "medium") med++; else other++;
      }
    }
    const flag = (n) => (n > 0 ? ` ⚠️${n}` : "");
    console.log(`${g}: ${rows.length}d ${total}q | subj ${JSON.stringify(subjCount)} | easy=${easy} med=${med} other=${other} | dupes=${dupes}${flag(dupes)} offChapter=${offChapter}${flag(offChapter)} unsafe=${unsafe}${flag(unsafe)}`);
    problems += dupes + unsafe;
  }
  console.log(problems === 0 ? "\n✅ No dupes, no unsafe renders." : `\n⚠️ ${problems} hard problems (dupes/unsafe).`);
})().catch(e => { console.error(e.message); process.exit(1); });
