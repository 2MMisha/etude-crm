import { z } from "zod";
import { ConflictError, getJsonFile, listDirectory, putJsonFile, type RepoRef } from "@/lib/github/contentsApi";
import { DATA_REPO, GITHUB_OWNER, GITHUB_TOKEN } from "@/lib/github/config";

export function dataRef(): RepoRef {
  return { owner: GITHUB_OWNER, repo: DATA_REPO, token: GITHUB_TOKEN };
}

/**
 * Reads every file in a shard directory (e.g. `clients/`) and validates each
 * against `schema`. At this studio's scale (dozens of files per collection,
 * §1) one request per file is simple and fast enough — no need for a bulk
 * endpoint or caching layer beyond what React Query already gives callers.
 */
export async function listCollection<T>(dir: string, schema: z.ZodType<T>): Promise<T[]> {
  const ref = dataRef();
  const entries = await listDirectory(ref, dir);
  const files = await Promise.all(entries.map((entry) => getJsonFile<unknown>(ref, entry.path)));
  return files.filter((f): f is { data: unknown; sha: string } => f !== null).map((f) => schema.parse(f.data));
}

export async function getDocument<T>(path: string, schema: z.ZodType<T>): Promise<T | null> {
  const result = await getJsonFile<unknown>(dataRef(), path);
  if (!result) return null;
  return schema.parse(result.data);
}

/** Replaces a whole document in one commit, refetching its sha first (last-write-wins is fine for admin-only screens). */
export async function saveDocument<T>(path: string, schema: z.ZodType<T>, data: T, message: string): Promise<void> {
  const existing = await getJsonFile<unknown>(dataRef(), path);
  await putJsonFile(dataRef(), path, schema.parse(data), existing?.sha ?? null, message);
}

const MAX_APPEND_RETRIES = 3;

/**
 * Fetch-or-create a month-shard document, apply `append`, and write it back —
 * retrying on 409 (§2.3) since appending is safe to redo against a freshly
 * refetched base. Used for cash/lessons, where each save adds one entry.
 */
export async function appendToMonthFile<TMonth, TItem>(
  path: string,
  schema: z.ZodType<TMonth>,
  emptyMonth: () => TMonth,
  append: (base: TMonth, item: TItem) => TMonth,
  item: TItem,
  message: string,
  attempt = 0,
): Promise<void> {
  const ref = dataRef();
  const existing = await getJsonFile<TMonth>(ref, path);
  const base = existing ? schema.parse(existing.data) : emptyMonth();
  const next = append(base, item);

  try {
    await putJsonFile(ref, path, next, existing?.sha ?? null, message);
  } catch (err) {
    if (err instanceof ConflictError && attempt < MAX_APPEND_RETRIES) {
      return appendToMonthFile(path, schema, emptyMonth, append, item, message, attempt + 1);
    }
    throw err;
  }
}
