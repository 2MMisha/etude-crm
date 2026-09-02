import { z } from "zod";
import { getJsonFile, listDirectory, type RepoRef } from "@/lib/github/contentsApi";
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
