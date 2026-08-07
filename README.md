# PYQ Daily

Only 3 previous-year JEE/NEET questions a day, by class + exam. Today's
leaderboard for your cohort, with solutions you can expand.

- Onboarding: name + class (11/12/dropper) + exam (JEE/NEET), no login.
- Each day, the same 3 questions are served to everyone in a class+exam
  group (`daily_sets`, pre-generated via `scripts/generate-daily-sets.js`).
- After submitting, see your score, today's leaderboard for your cohort,
  and expandable solutions.
- Challenge runs daily through `CHALLENGE_END_DATE` in `lib/campaign.js` —
  that's a server-side gate on question-serving only, never shown as a
  date/countdown in the UI.
- Analytics events (`page_view`, `registered`, `quiz_completed`, tab views,
  `share_clicked`, `profile_updated`) logged to the `events` table. See
  `supabase/schema.sql` for the `player_analytics` / `player_daily_activity` /
  `daily_event_summary` views built on top of it.

## Setup

1. Create a Supabase project. In the SQL editor, run `supabase/schema.sql`.
2. Copy `.env.local.example` to `.env.local` and fill in:
   - `SUPABASE_URL` — Project Settings → API → Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API → service_role key
     (server-only secret — never exposed to the browser, never committed)
3. `npm install`
4. `npm run dev` → http://localhost:3000

## Importing the question bank

Once you have the Excel file (columns: `exam`, `class`, `subject`,
`chapter`, `year`, `question`, `option_a..d`, `correct_option`, `solution`):

```bash
npm run import-pw-export -- ./questions.xlsx
```

Re-run any time to add more questions — it only inserts, never deletes.

## Maintenance scripts

- `npm run generate-daily-sets` — pre-generates `daily_sets` rows for every
  day through `CHALLENGE_END_DATE`, for every class+exam group. Skips days
  that already have a row.
- `node scripts/verify-daily-sets.js` — read-only QA over the generated
  schedule: subject balance, difficulty mix, render-safety, no repeats.
- `node scripts/reset-campaign-data.js` — clears `attempts`, `events`,
  `streaks`, `daily_sets`, `players` (never touches `questions`). Run this
  before a real launch to wipe test data, then re-run
  `generate-daily-sets`.

## Deploy

Deployed via the Vercel CLI, **not** a GitHub integration — pushing to the
GitHub mirror does not trigger a deploy.

```bash
vercel deploy --prod
```

Env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are set directly on
the Vercel project (`vercel env add <name> production`) — `.env.local` is
gitignored and never reaches Vercel on its own.
