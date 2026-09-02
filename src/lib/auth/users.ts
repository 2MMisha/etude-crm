import { getJsonFile, putJsonFile } from "@/lib/github/contentsApi";
import { DATA_REPO, GITHUB_OWNER, GITHUB_TOKEN } from "@/lib/github/config";
import { usersFileSchema, type UsersFile } from "@/schemas/user";

const USERS_PATH = "users.json";

function repoRef() {
  return { owner: GITHUB_OWNER, repo: DATA_REPO, token: GITHUB_TOKEN };
}

/** Returns null if users.json doesn't exist yet — the login screen treats that as "no admin account yet". */
export async function fetchUsers(): Promise<{ data: UsersFile; sha: string } | null> {
  const result = await getJsonFile<UsersFile>(repoRef(), USERS_PATH);
  if (!result) return null;
  return { data: usersFileSchema.parse(result.data), sha: result.sha };
}

export async function saveUsers(data: UsersFile, sha: string | null, message: string): Promise<void> {
  await putJsonFile(repoRef(), USERS_PATH, data, sha, message);
}
