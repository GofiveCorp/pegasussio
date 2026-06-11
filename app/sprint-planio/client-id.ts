const CLIENT_ID_KEY = "sprint-planio-client";

/**
 * A stable identity for this browser, shared across tabs of the same origin
 * and persisted across refreshes. Generated once and reused forever.
 *
 * Used to make joining a room idempotent: the same person always resolves to
 * one player row instead of inserting a duplicate. Client-only — relies on
 * localStorage and crypto.randomUUID.
 */
export function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}
