import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { canReadRepo } from "@/lib/github/contentsApi";
import { DATA_REPO, GITHUB_OWNER, INBOX_REPO } from "@/lib/github/config";
import type { Role } from "@/lib/auth/tokenStorage";

export const Route = createFileRoute("/login")({
  component: LoginScreen,
});

function LoginScreen() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("admin");
  const [dataToken, setDataToken] = useState("");
  const [inboxToken, setInboxToken] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("checking");
    setError(null);

    const dataOk = await canReadRepo({ owner: GITHUB_OWNER, repo: DATA_REPO, token: dataToken });
    if (!dataOk) {
      setStatus("error");
      setError(`Токен не даёт доступ к ${GITHUB_OWNER}/${DATA_REPO}. Проверьте PAT и его срок действия.`);
      return;
    }

    if (role === "teacher") {
      const inboxOk = await canReadRepo({ owner: GITHUB_OWNER, repo: INBOX_REPO, token: inboxToken });
      if (!inboxOk) {
        setStatus("error");
        setError(`Токен не даёт доступ к ${GITHUB_OWNER}/${INBOX_REPO}. Проверьте PAT и его срок действия.`);
        return;
      }
    }

    login({ role, dataToken, inboxToken: role === "teacher" ? inboxToken : null });
    navigate({ to: role === "admin" ? "/admin" : "/teacher" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Etude CRM</h1>
        <p className="mt-1 text-sm text-gray-500">Войдите с личным токеном GitHub (PAT).</p>

        <div className="mt-4 flex rounded-md border border-gray-200 p-1 text-sm">
          {(["admin", "teacher"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 rounded px-2 py-1 ${role === r ? "bg-gray-900 text-white" : "text-gray-600"}`}
            >
              {r === "admin" ? "Админ" : "Преподаватель"}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-sm text-gray-700">
          PAT для {GITHUB_OWNER}/{DATA_REPO}
          <input
            type="password"
            value={dataToken}
            onChange={(e) => setDataToken(e.target.value)}
            required
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            placeholder="github_pat_..."
          />
        </label>

        {role === "teacher" && (
          <label className="mt-3 block text-sm text-gray-700">
            PAT для {GITHUB_OWNER}/{INBOX_REPO}
            <input
              type="password"
              value={inboxToken}
              onChange={(e) => setInboxToken(e.target.value)}
              required
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              placeholder="github_pat_..."
            />
          </label>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={status === "checking"}
          className="mt-4 w-full rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {status === "checking" ? "Проверка…" : "Войти"}
        </button>
      </form>
    </div>
  );
}
