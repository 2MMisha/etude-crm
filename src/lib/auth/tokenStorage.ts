/**
 * Local session storage (single-repo variant). The GitHub write token is no
 * longer per-person — it's the one shared `GITHUB_TOKEN` in
 * src/lib/github/config.ts, baked in at build time. This module only
 * remembers *who is currently logged in* (username/role/teacherId) so the
 * app can gate routes and attribute writes (e.g. attendance `recordedBy`).
 */

export type Role = "admin" | "teacher";

const STORAGE_KEY = "etude.auth.session";

export interface Session {
  userId: string;
  username: string;
  role: Role;
  /** settings.teachers[].id — set when role is "teacher". */
  teacherId: string | null;
}

export function loadSession(): Session | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}
