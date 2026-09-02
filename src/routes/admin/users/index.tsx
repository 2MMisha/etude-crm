import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchUsers, saveUsers } from "@/lib/auth/users";
import { generateSalt, hashPassword } from "@/lib/auth/password";
import { useSettings } from "@/lib/data/settings";
import { QueryState } from "@/components/QueryState";
import { ConflictError } from "@/lib/github/contentsApi";
import type { User, UsersFile } from "@/schemas/user";
import type { Settings } from "@/schemas/settings";

export const Route = createFileRoute("/admin/users/")({
  component: UsersScreen,
});

function useUsersQuery() {
  return useQuery({ queryKey: ["users"], queryFn: fetchUsers });
}

function UsersScreen() {
  const usersQuery = useUsersQuery();
  const settingsQuery = useSettings();

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900">Пользователи</h1>
      <QueryState query={usersQuery} loadingLabel="Загружаю пользователей…">
        {(users) => (
          <QueryState query={settingsQuery}>
            {(settings) => <UsersPanel users={users} settings={settings} />}
          </QueryState>
        )}
      </QueryState>
    </div>
  );
}

function UsersPanel({
  users,
  settings,
}: {
  users: { data: UsersFile; sha: string } | null;
  settings: Settings | null;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<User["role"]>("teacher");
  const [newTeacherId, setNewTeacherId] = useState("");

  const teacherNameById = new Map((settings?.teachers ?? []).map((t) => [t.id, t.name]));
  const list = users?.data.users ?? [];

  async function persist(nextUsers: User[], message: string) {
    setSaving(true);
    setError(null);
    try {
      await saveUsers({ users: nextUsers }, users?.sha ?? null, message);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err) {
      if (err instanceof ConflictError) {
        setError("Список пользователей изменили в другом месте. Обновите страницу и повторите.");
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (newRole === "teacher" && !newTeacherId) {
      setError("Выберите педагога для этого аккаунта.");
      return;
    }
    const salt = generateSalt();
    const passwordHash = await hashPassword(newPassword, salt);
    const user: User = {
      id: crypto.randomUUID(),
      username: newUsername,
      salt,
      passwordHash,
      role: newRole,
      teacherId: newRole === "teacher" ? newTeacherId : null,
      active: true,
    };
    await persist([...list, user], `Добавлен пользователь ${newUsername}`);
    setNewUsername("");
    setNewPassword("");
    setNewTeacherId("");
  }

  function toggleActive(user: User) {
    const next = list.map((u) => (u.id === user.id ? { ...u, active: !u.active } : u));
    void persist(next, `${user.active ? "Деактивирован" : "Активирован"} пользователь ${user.username}`);
  }

  return (
    <div className="mt-4 max-w-2xl">
      {list.length === 0 ? (
        <p className="text-sm text-gray-500">Пока только первый администратор (создан при входе).</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2 pr-4">Логин</th>
              <th className="py-2 pr-4">Роль</th>
              <th className="py-2 pr-4">Педагог</th>
              <th className="py-2 pr-4">Статус</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="border-b border-gray-100">
                <td className="py-2 pr-4">{u.username}</td>
                <td className="py-2 pr-4">{u.role === "admin" ? "Админ" : "Преподаватель"}</td>
                <td className="py-2 pr-4">{u.teacherId ? (teacherNameById.get(u.teacherId) ?? u.teacherId) : "—"}</td>
                <td className="py-2 pr-4">{u.active ? "Активен" : "Отключён"}</td>
                <td className="py-2 pr-4">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => toggleActive(u)}
                    className="text-gray-500 hover:underline disabled:opacity-50"
                  >
                    {u.active ? "Отключить" : "Включить"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={handleAdd} className="mt-6 rounded border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-900">Новый пользователь</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <input
            type="text"
            required
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Логин"
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Пароль"
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as User["role"])}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="teacher">Преподаватель</option>
            <option value="admin">Админ</option>
          </select>
          {newRole === "teacher" && (
            <select
              value={newTeacherId}
              onChange={(e) => setNewTeacherId(e.target.value)}
              required
              className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">Педагог…</option>
              {(settings?.teachers ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Сохраняю…" : "Добавить"}
          </button>
        </div>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
