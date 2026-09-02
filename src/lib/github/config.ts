/**
 * Where the data/inbox repos live (§2.1). Owner defaults to this app repo's
 * owner but is overridable via env, since the org could differ.
 */
export const GITHUB_OWNER = import.meta.env.VITE_GITHUB_OWNER ?? "2MMisha";
export const DATA_REPO = import.meta.env.VITE_DATA_REPO ?? "etude-crm-data";
export const INBOX_REPO = import.meta.env.VITE_INBOX_REPO ?? "etude-crm-inbox";
