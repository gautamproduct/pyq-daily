#!/usr/bin/env node
// One-off maintenance: clears the pre-launch TEST data and the STALE daily
// schedule so the campaign can start clean under the current picker.
//
//   - daily_sets:  MUST be cleared — generate-daily-sets.js skips days that
//                  already have a row, so old picks would otherwise stick.
//   - attempts / streaks / players: pre-launch test plays only (a handful of
//                  rows from manual QA); clearing them gives a real, empty
//                  leaderboard at launch.
//
// Does NOT touch the `questions` bank. Run: node scripts/reset-campaign-data.js

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envPath = path.join(__dirname, "..", ".env.local");
fs.readFileSync(envPath, "utf8")
  .split("\n")
  .forEach((l) => {
    const t = l.trim();
    if (!t || t.startsWith("#")) return;
    const i = t.indexOf("=");
    if (i > -1) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  });

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  // Order matters for FK constraints: children before parents. `streaks` is
  // keyed on player_id (no id column), the rest on id.
  const tables = [
    { name: "attempts", key: "id" },
    { name: "streaks", key: "player_id" },
    { name: "daily_sets", key: "id" },
    { name: "players", key: "id" },
  ];
  for (const { name, key } of tables) {
    const { error } = await db.from(name).delete().not(key, "is", null);
    console.log(`cleared ${name}: ${error ? "ERROR " + error.message : "ok"}`);
    if (error) process.exit(1);
  }
  for (const table of ["attempts", "streaks", "daily_sets", "players", "questions"]) {
    const { count } = await db.from(table).select("id", { count: "exact", head: true });
    console.log(`  ${table}: ${count}`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
