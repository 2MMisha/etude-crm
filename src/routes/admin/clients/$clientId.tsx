import { createFileRoute, Link } from "@tanstack/react-router";
import { useClient } from "@/lib/data/clients";
import { useStudents } from "@/lib/data/students";
import { useGroups } from "@/lib/data/groups";
import { useEnrollments } from "@/lib/data/enrollments";
import { QueryState } from "@/components/QueryState";
import { CLIENT_STATUS_LABEL, CLIENT_TYPE_LABEL, STUDENT_STATUS_LABEL } from "@/lib/labels";
import type { Client } from "@/schemas/client";
import type { Student } from "@/schemas/student";
import type { Group } from "@/schemas/group";
import type { Enrollment } from "@/schemas/enrollment";

export const Route = createFileRoute("/admin/clients/$clientId")({
  component: ClientDetailScreen,
});

function ageFromBirthDate(birthDate: string): number {
  const [y, m, d] = birthDate.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age;
}

function ClientDetailScreen() {
  const { clientId } = Route.useParams();
  const clientQuery = useClient(clientId);
  const studentsQuery = useStudents();
  const groupsQuery = useGroups();
  const enrollmentsQuery = useEnrollments();

  return (
    <div className="p-6">
      <Link to="/admin/clients" className="text-sm text-gray-500 hover:underline">
        ← Клиенты
      </Link>

      <QueryState query={clientQuery} loadingLabel="Загружаю клиента…">
        {(client) =>
          client === null ? (
            <p className="mt-4 text-sm text-red-600">Клиент «{clientId}» не найден.</p>
          ) : (
            <QueryState query={studentsQuery}>
              {(students) => (
                <QueryState query={groupsQuery}>
                  {(groups) => (
                    <QueryState query={enrollmentsQuery}>
                      {(enrollments) => (
                        <ClientCard
                          client={client}
                          students={students.filter((s) => s.clientId === client.id)}
                          groups={groups}
                          enrollments={enrollments}
                        />
                      )}
                    </QueryState>
                  )}
                </QueryState>
              )}
            </QueryState>
          )
        }
      </QueryState>
    </div>
  );
}

function ClientCard({
  client,
  students,
  groups,
  enrollments,
}: {
  client: Client;
  students: Student[];
  groups: Group[];
  enrollments: Enrollment[];
}) {
  const groupById = new Map(groups.map((g) => [g.id, g]));

  return (
    <div className="mt-4 max-w-2xl">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{client.name}</h1>
        <span className="text-sm text-gray-500">{client.id}</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-gray-500">Телефон</dt>
        <dd>{client.phone}</dd>
        <dt className="text-gray-500">Email</dt>
        <dd>{client.email || "—"}</dd>
        <dt className="text-gray-500">Тип</dt>
        <dd>{CLIENT_TYPE_LABEL[client.type] ?? client.type}</dd>
        <dt className="text-gray-500">Статус</dt>
        <dd>{CLIENT_STATUS_LABEL[client.status] ?? client.status}</dd>
        <dt className="text-gray-500">Источник</dt>
        <dd>{client.source || "—"}</dd>
        <dt className="text-gray-500">Дата регистрации</dt>
        <dd>{client.registeredAt}</dd>
        {client.specialDiscount > 0 && (
          <>
            <dt className="text-gray-500">Спецскидка</dt>
            <dd>{Math.round(client.specialDiscount * 100)}%</dd>
          </>
        )}
      </dl>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-gray-900">Баланс</h2>
        <p className="mt-1 text-sm text-gray-500">Появится в Фазе 3.</p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-gray-900">Семья ({students.length})</h2>
        {students.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">Учеников не найдено.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {students.map((s) => {
              const activeGroups = enrollments
                .filter((e) => e.studentId === s.id && e.endedAt === null)
                .map((e) => groupById.get(e.groupId))
                .filter((g): g is Group => g !== undefined);
              return (
                <li key={s.id} className="rounded border border-gray-200 p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium text-gray-900">{s.name}</span>
                    <span className="text-xs text-gray-500">
                      {ageFromBirthDate(s.birthDate)} лет · {STUDENT_STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </div>
                  {activeGroups.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">{activeGroups.map((g) => g.name).join(", ")}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {client.notes && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-gray-900">Примечания</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{client.notes}</p>
        </section>
      )}
    </div>
  );
}
