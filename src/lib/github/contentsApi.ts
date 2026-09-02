/**
 * GitHub Contents API client (§2.3). One PUT = one commit.
 * `sha` is mandatory on every write and gives optimistic locking: a stale `sha`
 * gets a 409, surfaced here as `ConflictError` so the caller must explicitly
 * refetch/merge/retry — this client never silently overwrites.
 */

const API_BASE = "https://api.github.com";

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

/** Thrown on HTTP 409 — the file changed since the `sha` we read was current. */
export class ConflictError extends GitHubApiError {
  constructor(public readonly path: string) {
    super(`Conflict writing ${path}: file changed since it was last read`, 409);
    this.name = "ConflictError";
  }
}

export interface RepoRef {
  owner: string;
  repo: string;
  token: string;
}

export interface GetFileResult {
  content: string;
  sha: string;
}

function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/** Reads a file's raw text content and current `sha`. Returns null if the file doesn't exist yet. */
export async function getFile(ref: RepoRef, path: string): Promise<GetFileResult | null> {
  const url = `${API_BASE}/repos/${ref.owner}/${ref.repo}/contents/${path}`;
  const response = await fetch(url, { headers: authHeaders(ref.token) });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new GitHubApiError(`Failed to read ${path}: ${response.status}`, response.status);
  }

  const body = (await response.json()) as { content: string; sha: string };
  return { content: decodeBase64Utf8(body.content), sha: body.sha };
}

/** Reads and JSON.parses a file. Returns null if it doesn't exist. */
export async function getJsonFile<T>(ref: RepoRef, path: string): Promise<{ data: T; sha: string } | null> {
  const file = await getFile(ref, path);
  if (!file) return null;
  return { data: JSON.parse(file.content) as T, sha: file.sha };
}

export interface PutFileResult {
  sha: string;
}

/**
 * Writes a file in one commit. `sha` must be the sha last read for this path,
 * or null when creating a brand-new file. Throws ConflictError on 409 — the
 * caller is responsible for refetching, merging, and retrying explicitly.
 */
export async function putFile(
  ref: RepoRef,
  path: string,
  content: string,
  sha: string | null,
  message: string,
): Promise<PutFileResult> {
  const url = `${API_BASE}/repos/${ref.owner}/${ref.repo}/contents/${path}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { ...authHeaders(ref.token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: encodeBase64Utf8(content),
      ...(sha ? { sha } : {}),
    }),
  });

  if (response.status === 409) throw new ConflictError(path);
  if (!response.ok) {
    throw new GitHubApiError(`Failed to write ${path}: ${response.status}`, response.status);
  }

  const body = (await response.json()) as { content: { sha: string } };
  return { sha: body.content.sha };
}

/** JSON.stringifies and writes a file — the one-mutation-one-commit helper most call sites should use. */
export async function putJsonFile<T>(
  ref: RepoRef,
  path: string,
  data: T,
  sha: string | null,
  message: string,
): Promise<PutFileResult> {
  return putFile(ref, path, JSON.stringify(data, null, 2) + "\n", sha, message);
}

export interface DirectoryEntry {
  name: string;
  path: string;
}

/**
 * Lists the files directly inside a directory (e.g. `clients/`) — the shard
 * layout (§3) has one file per entity, so listing a collection means listing
 * a directory. Returns [] if the directory doesn't exist yet (nothing saved there yet).
 */
export async function listDirectory(ref: RepoRef, path: string): Promise<DirectoryEntry[]> {
  const url = `${API_BASE}/repos/${ref.owner}/${ref.repo}/contents/${path}`;
  const response = await fetch(url, { headers: authHeaders(ref.token) });

  if (response.status === 404) return [];
  if (!response.ok) {
    throw new GitHubApiError(`Failed to list ${path}: ${response.status}`, response.status);
  }

  const body = (await response.json()) as unknown;
  if (!Array.isArray(body)) throw new GitHubApiError(`Expected a directory at ${path}`, response.status);
  return (body as { name: string; path: string; type: string }[])
    .filter((entry) => entry.type === "file" && entry.name.endsWith(".json"))
    .map((entry) => ({ name: entry.name, path: entry.path }));
}
