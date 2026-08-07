// Dedicated single-cohort domains — class/exam/variant baked into the
// hostname, never asked in onboarding. Used both server-side (req.headers.host)
// and client-side (window.location.hostname). The two general domains
// (daily-pyq.vercel.app, pyq-daily.vercel.app) are NOT in this table — they
// keep the dynamic class/exam picker, only variant is host-locked (see
// lib/variant.js).
const HOST_CONFIG = {
  "daily-pyq-jee.vercel.app": { class: "11", exam: "JEE", variant: "q3" },
  "pyq-daily-jee.vercel.app": { class: "11", exam: "JEE", variant: "q8" },
  "daily-pyq-neet.vercel.app": { class: "12", exam: "NEET", variant: "q3" },
  "pyq-daily-neet.vercel.app": { class: "12", exam: "NEET", variant: "q8" },
};

// Returns { class, exam, variant } for a locked single-cohort host, or null
// for a general (pick-your-own) host.
export function siteConfigForHost(host) {
  const h = (host || "").toLowerCase().split(":")[0];
  return HOST_CONFIG[h] || null;
}

export function fixedLabel(config) {
  if (!config) return "";
  const classLabel = config.class === "dropper" ? "Dropper" : `Class ${config.class}`;
  return `${classLabel} · ${config.exam}`;
}
