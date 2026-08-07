// fetch() throws a bare "TypeError: Failed to fetch" on network failure
// (server down, offline, CORS) — this normalizes that into the same
// { error: string } shape our API routes already return on failure, so
// every call site's existing `if (data.error)` handling covers it without
// letting the exception escape and crash the page.
export async function safeFetchJson(url, options) {
  try {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok && !data.error) {
      return { error: `Something went wrong (${res.status}). Please try again.` };
    }
    return data;
  } catch (e) {
    return { error: "Can't reach the server right now. Check your connection and try again." };
  }
}
