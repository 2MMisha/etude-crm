import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/AuthContext";
import { useGroups } from "@/lib/data/groups";
import { QueryState } from "@/components/QueryState";
import { todayDateString } from "@/lib/dates";
import { WEEKDAY_LABEL } from "@/lib/labels";
import type { Group } from "@/schemas/group";

export const Route = createFileRoute("/teacher/attendance/")({
  component: AttendanceGroupsScreen,
});

function AttendanceGroupsScreen() {
  const { session } = useAuth();
  const groupsQuery = useGroups();
  const today = todayDateString();

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900">Посещаемость</h1>
      <p className="mt-1 text-sm text-gray-500">Выберите группу, чтобы отметить посещаемость.</p>
      <QueryState query={groupsQuery} loadingLabel="Загружаю группы…">
        {(groups) => {
          const mine = groups.filter((g) => g.active && g.teacherId === session?.teacherId);
          return <GroupsList groups={mine} today={today} />;
        }}
      </QueryState>
    </div>
  );
}

function GroupsList({ groups, today }: { groups: Group[]; today: string }) {
  if (groups.length === 0) {
    return <p className="mt-6 text-sm text-gray-500">Групп не назначено.</p>;
  }
  return (
    <ul className="mt-4 space-y-2">
      {groups.map((g) => (
        <li key={g.id}>
          <Link
            to="/teacher/attendance/$groupId"
            params={{ groupId: g.id }}
            search={{ date: today }}
            className="flex items-center justify-between rounded border border-gray-200 bg-white px-4 py-3 hover:border-gray-300"
          >
            <span className="font-medium text-gray-900">{g.name}</span>
            <span className="text-sm text-gray-500">{g.days.map((d) => WEEKDAY_LABEL[d] ?? d).join("/")}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
