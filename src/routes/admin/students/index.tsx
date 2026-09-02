import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStudents } from "@/lib/data/students";
import { useClients } from "@/lib/data/clients";
import { QueryState } from "@/components/QueryState";
import { SEX_LABEL, STUDENT_STATUS_LABEL } from "@/lib/labels";
import type { Student } from "@/schemas/student";
import type { Client } from "@/schemas/client";

export const Route = createFileRoute("/admin/students/")({
  component: StudentsScreen,
});

function ageFromBirthDate(birthDate: string): number {
  const [y, m, d] = birthDate.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age;
}

function StudentsScreen() {
  const studentsQuery = useStudents();
  const clientsQuery = useClients();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Student["status"] | "all">("all");

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900">Ученики</h1>

      <div className="mt-4 flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени"
          className="w-64 rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Student["status"] | "all")}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="all">Все статусы</option>
          {Object.entries(STUDENT_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <QueryState query={studentsQuery} loadingLabel="Загружаю учеников…">
        {(students) => (
          <QueryState query={clientsQuery}>
            {(clients) => <StudentsTable students={students} clients={clients} search={search} status={status} />}
          </QueryState>
        )}
      </QueryState>
    </div>
  );
}

function StudentsTable({
  students,
  clients,
  search,
  status,
}: {
  students: Student[];
  clients: Client[];
  search: string;
  status: Student["status"] | "all";
}) {
  const clientById = new Map(clients.map((c) => [c.id, c]));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((s) => {
      if (status !== "all" && s.status !== status) return false;
      if (!term) return true;
      return s.name.toLowerCase().includes(term);
    });
  }, [students, search, status]);

  if (students.length === 0) {
    return <p className="mt-6 text-sm text-gray-500">Учеников пока нет — перенесите данные из Excel.</p>;
  }
  if (filtered.length === 0) {
    return <p className="mt-6 text-sm text-gray-500">Ничего не найдено.</p>;
  }

  return (
    <table className="mt-4 w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2 pr-4">ID</th>
          <th className="py-2 pr-4">Имя</th>
          <th className="py-2 pr-4">Клиент</th>
          <th className="py-2 pr-4">Возраст</th>
          <th className="py-2 pr-4">Пол</th>
          <th className="py-2 pr-4">Статус</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((s) => (
          <tr key={s.id} className="border-b border-gray-100">
            <td className="py-2 pr-4 text-gray-500">{s.id}</td>
            <td className="py-2 pr-4 text-gray-900">{s.name}</td>
            <td className="py-2 pr-4">
              {clientById.has(s.clientId) ? (
                <Link to="/admin/clients/$clientId" params={{ clientId: s.clientId }} className="hover:underline">
                  {clientById.get(s.clientId)?.name}
                </Link>
              ) : (
                s.clientId
              )}
            </td>
            <td className="py-2 pr-4">{ageFromBirthDate(s.birthDate)}</td>
            <td className="py-2 pr-4">{SEX_LABEL[s.sex] ?? s.sex}</td>
            <td className="py-2 pr-4">{STUDENT_STATUS_LABEL[s.status] ?? s.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
