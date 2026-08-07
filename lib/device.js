const KEY = "pyqdaily_device_id";
const PROFILE_KEY = "pyqdaily_profile";

export function getDeviceId() {
  if (typeof window === "undefined") return null;
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function getSavedProfile() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
  } catch {
    return null;
  }
}

export function saveProfile(profile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function track(event_name, metadata) {
  if (typeof window === "undefined") return;
  const device_id = getDeviceId();
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_id, event_name, metadata }),
  }).catch(() => {});
}
