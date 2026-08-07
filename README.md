# PYQ Daily

3 previous-year JEE/NEET questions a day, by class + exam. Daily leaderboard
with solutions, streaks, and a final cumulative leaderboard revealed after
the challenge ends.

- Onboarding: name + class (11/12/dropper) + exam (JEE/NEET), no login.
- Each day, the same 3 questions are served to everyone in a class+exam
  group (`daily_sets`, auto-created on first request of the day).
- After submitting, see score, correct answers + solutions, today's
  leaderboard, and the running streak.
- Challenge runs daily through **Aug 15**; the final leaderboard (ranked by
  days played, then accuracy, then speed) unlocks **Aug 16** at `/final`.
- Analytics events (`registered`, `quiz_started`, `quiz_completed`, etc.)
  logged to the `events` table.

Dates live in `lib/campaign.js` — change `CAMPAIGN_START`,
`CHALLENGE_END_DATE`, `FINAL_LEADERBOARD_DATE` there if the schedule shifts.

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
npm run import-questions -- ./questions.xlsx
```

Re-run any time to add more questions — it only inserts, never deletes.
`daily_sets` are picked automatically from unused questions per group each
day, so no manual scheduling step is needed.

## Deploy

- Push to GitHub, import the repo in Vercel.
- Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as Vercel environment
  variables (Production + Preview).
