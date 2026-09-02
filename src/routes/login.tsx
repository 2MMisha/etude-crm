import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { hashPassword, generateSalt } from "@/lib/auth/password";
import { fetchUsers, saveUsers } from "@/lib/auth/users";
import type { User } from "@/schemas/user";

export const Route = createFileRoute("/login")({
  component: LoginScreen,
});

type Mode = "checking" | "login" | "bootstrap";

function LoginScreen() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("checking");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchUsers()
      .then((existing) => {
        if (!cancelled) setMode(existing ? "login" : "bootstrap");
      })
      .catch(() => {
        if (!cancelled) setMode("login");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const existing = await fetchUsers();

      if (!existing) {
        const salt = generateSalt();
        const passwordHash = await hashPassword(password, salt);
        const admin: User = {
          id: crypto.randomUUID(),
          username,
          salt,
          passwordHash,
          role: "admin",
          teacherId: null,
          active: true,
        };
        await saveUsers({ users: [admin] }, null, `Создан первый администратор: ${username}`);
        login({ userId: admin.id, username: admin.username, role: admin.role, teacherId: null });
        navigate({ to: "/admin" });
        return;
      }

      const user = existing.data.users.find((u) => u.username === username);
      if (!user || !user.active) {
        setError("Неверный логин или пароль.");
        return;
      }
      const hash = await hashPassword(password, user.salt);
      if (hash !== user.passwordHash) {
        setError("Неверный логин или пароль.");
        return;
      }

      login({ userId: user.id, username: user.username, role: user.role, teacherId: user.teacherId });
      navigate({ to: user.role === "admin" ? "/admin" : "/teacher" });
    } catch {
      setError("Не удалось связаться с GitHub. Проверьте, что приложение собрано с рабочим токеном.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Etude CRM</h1>
        <p className="mt-1 text-sm text-gray-500">
          {mode === "bootstrap"
            ? "Аккаунтов ещё нет. Этот вход создаст первого администратора."
            : "Войдите со своим логином и паролем."}
        </p>

        <label className="mt-4 block text-sm text-gray-700">
          Логин
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </label>

        <label className="mt-3 block text-sm text-gray-700">
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "bootstrap" ? "new-password" : "current-password"}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </label>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || mode === "checking"}
          className="mt-4 w-full rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Проверка…" : mode === "bootstrap" ? "Создать администратора" : "Войти"}
        </button>
      </form>
    </div>
  );
}
