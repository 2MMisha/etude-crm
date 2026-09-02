import { useAuth } from "@/lib/auth/AuthContext";

export function AppHeader() {
  const { role, logout } = useAuth();
  if (!role) return null;

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <div className="font-semibold text-gray-900">Etude CRM</div>
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>{role === "admin" ? "Админ" : "Преподаватель"}</span>
        <button className="text-gray-400 hover:text-gray-700" onClick={logout}>
          Выйти
        </button>
      </div>
    </header>
  );
}
