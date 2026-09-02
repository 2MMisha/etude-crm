import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useClients } from "@/lib/data/clients";
import { CLIENT_STATUS_LABEL, CLIENT_TYPE_LABEL } from "@/lib/labels";
import { QueryState } from "@/components/QueryState";
import type { Client } from "@/schemas/client";

export const Route = createFileRoute("/admin/clients/")({
  component: ClientsScreen,
});

function ClientsScreen() {
  const query = useClients();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Client["status"] | "all">("all");

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900">Клиенты</h1>

      <div className="mt-4 flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени или телефону"
          className="w-64 rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Client["status"] | "all")}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="all">Все статусы</option>
          {Object.entries(CLIENT_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <QueryState query={query} loadingLabel="Загружаю клиентов…">
        {(clients) => <ClientsTable clients={clients} search={search} status={status} />}
      </QueryState>
    </div>
  );
}

function ClientsTable({
  clients,
  search,
  status,
}: {
  clients: Client[];
  search: string;
  status: Client["status"] | "all";
}) {
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (!term) return true;
      return c.name.toLowerCase().includes(term) || c.phone.toLowerCase().includes(term);
    });
  }, [clients, search, status]);

  if (clients.length === 0) {
    return <p className="mt-6 text-sm text-gray-500">Клиентов пока нет — перенесите данные из Excel.</p>;
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
          <th className="py-2 pr-4">Телефон</th>
          <th className="py-2 pr-4">Тип</th>
          <th className="py-2 pr-4">Статус</th>
          <th className="py-2 pr-4">Источник</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((c) => (
          <tr key={c.id} className="border-b border-gray-100">
            <td className="py-2 pr-4 text-gray-500">{c.id}</td>
            <td className="py-2 pr-4">
              <Link to="/admin/clients/$clientId" params={{ clientId: c.id }} className="text-gray-900 hover:underline">
                {c.name}
              </Link>
            </td>
            <td className="py-2 pr-4">{c.phone}</td>
            <td className="py-2 pr-4">{CLIENT_TYPE_LABEL[c.type] ?? c.type}</td>
            <td className="py-2 pr-4">{CLIENT_STATUS_LABEL[c.status] ?? c.status}</td>
            <td className="py-2 pr-4">{c.source}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
