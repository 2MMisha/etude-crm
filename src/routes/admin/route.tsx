import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { loadAuth } from "@/lib/auth/tokenStorage";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    const auth = loadAuth();
    if (!auth) throw redirect({ to: "/login" });
    if (auth.role !== "admin") throw redirect({ to: "/teacher" });
  },
  component: AdminLayout,
});

const NAV_ITEMS = [
  { to: "/admin", label: "Дашборд" },
  { to: "/admin/clients", label: "Клиенты" },
  { to: "/admin/students", label: "Ученики" },
  { to: "/admin/groups", label: "Группы" },
  { to: "/admin/enrollments", label: "Записи" },
  { to: "/admin/cash", label: "Касса" },
  { to: "/admin/lessons", label: "Индивидуальные" },
  { to: "/admin/attendance", label: "Посещаемость" },
  { to: "/admin/charges", label: "Начисления" },
  { to: "/admin/payroll", label: "Зарплата" },
  { to: "/admin/leads", label: "Лиды" },
  { to: "/admin/settings", label: "Настройки" },
] as const;

function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <div className="flex">
        <nav className="w-48 shrink-0 border-r border-gray-200 bg-white p-3">
          <ul className="space-y-1 text-sm">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  activeOptions={{ exact: item.to === "/admin" }}
                  className="block rounded px-2 py-1.5 text-gray-600 hover:bg-gray-100"
                  activeProps={{ className: "block rounded px-2 py-1.5 bg-gray-100 text-gray-900 font-medium" }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
