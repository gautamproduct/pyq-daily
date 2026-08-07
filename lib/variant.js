import { siteConfigForHost } from "./site-config";

// Two experiment arms, split by which domain a player lands on. The variant
// is decided ONCE at registration (from the request host) and stored on the
// player row — every later request re-derives it from that stored value,
// never from the current request's host, so it stays stable even if someone
// bookmarks or revisits via the other domain.
export const VARIANTS = {
  q3: { key: "q3", questionsPerDay: 3 },
  q8: { key: "q8", questionsPerDay: 8 },
};

// The two general (pick-your-own class/exam) domains. The 4 dedicated
// single-cohort domains carry their variant in lib/site-config.js instead —
// checked first below, since that table is the source of truth for those
// hosts (and covers class/exam too, which this table can't).
const HOST_TO_VARIANT = {
  "daily-pyq.vercel.app": "q3",
  "pyq-daily.vercel.app": "q8",
};

const DEFAULT_VARIANT = "q3";

// `?variant=q8` is a local-dev-only override so the 8-question arm is
// testable on localhost without DNS. Production hosts are always host-locked
// and ignore the query param.
export function variantForRequest(req) {
  const host = (req.headers.host || "").toLowerCase().split(":")[0];
  const fixed = siteConfigForHost(host);
  if (fixed) return fixed.variant;
  if (HOST_TO_VARIANT[host]) return HOST_TO_VARIANT[host];
  const override = req.query?.variant;
  if (override && VARIANTS[override]) return override;
  return DEFAULT_VARIANT;
}

export function questionsPerDay(variant) {
  return VARIANTS[variant]?.questionsPerDay ?? VARIANTS[DEFAULT_VARIANT].questionsPerDay;
}
