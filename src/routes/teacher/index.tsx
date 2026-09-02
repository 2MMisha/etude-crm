import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth/AuthContext";
import { useGroups } from "@/lib/data/groups";
import { QueryState } from "@/components/QueryState";
import { todayDateString, weekdayCodeOf } from "@/lib/dates";
import type { Group } from "@/schemas/group";

export const Route = createFileRoute("/teacher/")({
  component: TodayScreen,
});

function TodayScreen() {
  const { session } = useAuth();
  const groupsQuery = useGroups();
  const today = todayDateString();
  const todayCode = weekdayCodeOf(today);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900">Мои группы на сегодня</h1>
      <QueryState query={groupsQuery} loadingLabel="Загружаю группы…">
        {(groups) => {
          const mine = groups
            .filter((g) => g.active && g.teacherId === session?.teacherId && g.days.includes(todayCode))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          return <TodayList groups={mine} today={today} />;
        }}
      </QueryState>
    </div>
  );
}

function TodayList({ groups, today }: { groups: Group[]; today: string }) {
  if (groups.length === 0) {
    return <p className="mt-6 text-sm text-gray-500">На сегодня групп не запланировано.</p>;
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
            <div>
              <div className="font-medium text-gray-900">{g.name}</div>
              <div className="text-sm text-gray-500">{g.hall}</div>
            </div>
            <div className="text-sm text-gray-500">
              {g.startTime}–{g.endTime}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
