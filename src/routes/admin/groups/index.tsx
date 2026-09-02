import { createFileRoute } from "@tanstack/react-router";
import { useGroups } from "@/lib/data/groups";
import { useSettings } from "@/lib/data/settings";
import { QueryState } from "@/components/QueryState";
import { BILLING_LABEL, WEEKDAY_LABEL } from "@/lib/labels";
import type { Group } from "@/schemas/group";
import type { Settings } from "@/schemas/settings";

export const Route = createFileRoute("/admin/groups/")({
  component: GroupsScreen,
});

function GroupsScreen() {
  const groupsQuery = useGroups();
  const settingsQuery = useSettings();

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900">Группы</h1>

      <QueryState query={groupsQuery} loadingLabel="Загружаю группы…">
        {(groups) => (
          <QueryState query={settingsQuery}>{(settings) => <GroupsTable groups={groups} settings={settings} />}</QueryState>
        )}
      </QueryState>
    </div>
  );
}

function GroupsTable({ groups, settings }: { groups: Group[]; settings: Settings | null }) {
  const teacherNameById = new Map((settings?.teachers ?? []).map((t) => [t.id, t.name]));

  if (groups.length === 0) {
    return <p className="mt-6 text-sm text-gray-500">Групп пока нет — перенесите данные из Excel.</p>;
  }

  return (
    <table className="mt-4 w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2 pr-4">Код</th>
          <th className="py-2 pr-4">Название</th>
          <th className="py-2 pr-4">Направление / уровень</th>
          <th className="py-2 pr-4">Педагог</th>
          <th className="py-2 pr-4">Расписание</th>
          <th className="py-2 pr-4">Зал</th>
          <th className="py-2 pr-4">Вместимость</th>
          <th className="py-2 pr-4">Оплата</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => (
          <tr key={g.id} className={`border-b border-gray-100 ${g.active ? "" : "text-gray-400"}`}>
            <td className="py-2 pr-4 text-gray-500">{g.id}</td>
            <td className="py-2 pr-4 text-gray-900">{g.name}</td>
            <td className="py-2 pr-4">
              {g.direction} · {g.level}
            </td>
            <td className="py-2 pr-4">{teacherNameById.get(g.teacherId) ?? g.teacherId}</td>
            <td className="py-2 pr-4">
              {g.days.map((d) => WEEKDAY_LABEL[d] ?? d).join("/")} {g.startTime}–{g.endTime}
            </td>
            <td className="py-2 pr-4">{g.hall}</td>
            <td className="py-2 pr-4">{g.capacity}</td>
            <td className="py-2 pr-4">
              {BILLING_LABEL[g.billing] ?? g.billing} · {g.monthlyPrice > 0 ? `${g.monthlyPrice}₪/мес` : ""}{" "}
              {g.lessonPrice}₪/занятие
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
