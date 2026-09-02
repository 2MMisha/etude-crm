/**
 * PAT storage (§2.2). One token per repo per person, kept in localStorage.
 * Revocation is done in GitHub's token settings, not here — this module only
 * reads/writes the local copy that the browser uses to call the Contents API.
 */

export type Role = "admin" | "teacher";

const STORAGE_KEYS = {
  role: "etude.auth.role",
  dataToken: "etude.auth.dataToken",
  inboxToken: "etude.auth.inboxToken",
} as const;

export interface StoredAuth {
  role: Role;
  /** PAT scoped to etude-crm-data. Admin: read/write. Teacher: read-only (own groups/students). */
  dataToken: string;
  /** PAT scoped to etude-crm-inbox, read/write. Only set for role "teacher". */
  inboxToken: string | null;
}

export function loadAuth(): StoredAuth | null {
  const role = localStorage.getItem(STORAGE_KEYS.role) as Role | null;
  const dataToken = localStorage.getItem(STORAGE_KEYS.dataToken);
  if (!role || !dataToken) return null;

  const inboxToken = localStorage.getItem(STORAGE_KEYS.inboxToken);
  if (role === "teacher" && !inboxToken) return null;

  return { role, dataToken, inboxToken };
}

export function saveAuth(auth: StoredAuth): void {
  localStorage.setItem(STORAGE_KEYS.role, auth.role);
  localStorage.setItem(STORAGE_KEYS.dataToken, auth.dataToken);
  if (auth.inboxToken) {
    localStorage.setItem(STORAGE_KEYS.inboxToken, auth.inboxToken);
  } else {
    localStorage.removeItem(STORAGE_KEYS.inboxToken);
  }
}

export function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEYS.role);
  localStorage.removeItem(STORAGE_KEYS.dataToken);
  localStorage.removeItem(STORAGE_KEYS.inboxToken);
}
