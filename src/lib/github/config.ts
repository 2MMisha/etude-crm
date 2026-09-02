/**
 * Where the data repo lives (§2.1, single-repo variant). Owner defaults to
 * this app repo's owner but is overridable via env, since the org could differ.
 *
 * GITHUB_TOKEN is the one shared PAT for `DATA_REPO`, baked in at build time.
 * It is what every browser session — admin or teacher — uses to call the
 * Contents API. The login screen's username/password is an in-app UI gate
 * only, NOT a real security boundary: this token ships inside the public,
 * client-side JS bundle, so anyone who opens devtools on the deployed app
 * can read it and get full read/write access to etude-crm-data. This was a
 * deliberate, explicit tradeoff (see README) in exchange for not running any
 * backend. Never enter a real token through the UI, and never commit one —
 * it belongs only in `.env.local` (gitignored) or the `DATA_REPO_TOKEN`
 * GitHub Actions secret.
 */
export const GITHUB_OWNER = import.meta.env.VITE_GITHUB_OWNER ?? "2MMisha";
export const DATA_REPO = import.meta.env.VITE_DATA_REPO ?? "etude-crm-data";
export const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN ?? "";
