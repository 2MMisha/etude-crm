import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { loadSession } from "@/lib/auth/tokenStorage";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/teacher")({
  beforeLoad: () => {
    const session = loadSession();
    if (!session) throw redirect({ to: "/login" });
    if (session.role !== "teacher") throw redirect({ to: "/admin" });
  },
  component: TeacherLayout,
});

const NAV_ITEMS = [
  { to: "/teacher", label: "Сегодня" },
  { to: "/teacher/attendance", label: "Посещаемость" },
  { to: "/teacher/lessons", label: "Мои занятия" },
] as const;

function TeacherLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <nav className="flex gap-1 border-b border-gray-200 bg-white px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === "/teacher" }}
            className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            activeProps={{ className: "rounded px-3 py-1.5 text-sm bg-gray-100 text-gray-900 font-medium" }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
