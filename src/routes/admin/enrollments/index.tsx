import { createFileRoute, Link } from "@tanstack/react-router";
import { useEnrollments } from "@/lib/data/enrollments";
import { useStudents } from "@/lib/data/students";
import { useGroups } from "@/lib/data/groups";
import { QueryState } from "@/components/QueryState";
import type { Enrollment } from "@/schemas/enrollment";
import type { Student } from "@/schemas/student";
import type { Group } from "@/schemas/group";

export const Route = createFileRoute("/admin/enrollments/")({
  component: EnrollmentsScreen,
});

function EnrollmentsScreen() {
  const enrollmentsQuery = useEnrollments();
  const studentsQuery = useStudents();
  const groupsQuery = useGroups();

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900">Записи</h1>

      <QueryState query={enrollmentsQuery} loadingLabel="Загружаю записи…">
        {(enrollments) => (
          <QueryState query={studentsQuery}>
            {(students) => (
              <QueryState query={groupsQuery}>
                {(groups) => <EnrollmentsTable enrollments={enrollments} students={students} groups={groups} />}
              </QueryState>
            )}
          </QueryState>
        )}
      </QueryState>
    </div>
  );
}

function EnrollmentsTable({
  enrollments,
  students,
  groups,
}: {
  enrollments: Enrollment[];
  students: Student[];
  groups: Group[];
}) {
  const studentById = new Map(students.map((s) => [s.id, s]));
  const groupById = new Map(groups.map((g) => [g.id, g]));

  if (enrollments.length === 0) {
    return <p className="mt-6 text-sm text-gray-500">Записей пока нет — перенесите данные из Excel.</p>;
  }

  return (
    <table className="mt-4 w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2 pr-4">ID</th>
          <th className="py-2 pr-4">Ученик</th>
          <th className="py-2 pr-4">Группа</th>
          <th className="py-2 pr-4">Начало</th>
          <th className="py-2 pr-4">Окончание</th>
          <th className="py-2 pr-4">Статус</th>
        </tr>
      </thead>
      <tbody>
        {enrollments.map((e) => {
          const student = studentById.get(e.studentId);
          const group = groupById.get(e.groupId);
          return (
            <tr key={e.id} className="border-b border-gray-100">
              <td className="py-2 pr-4 text-gray-500">{e.id}</td>
              <td className="py-2 pr-4">
                {student ? (
                  <Link to="/admin/students" className="text-gray-900 hover:underline">
                    {student.name}
                  </Link>
                ) : (
                  e.studentId
                )}
              </td>
              <td className="py-2 pr-4">{group?.name ?? e.groupId}</td>
              <td className="py-2 pr-4">{e.startedAt}</td>
              <td className="py-2 pr-4">{e.endedAt ?? "—"}</td>
              <td className="py-2 pr-4">{e.endedAt === null ? "Активна" : "Завершена"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
