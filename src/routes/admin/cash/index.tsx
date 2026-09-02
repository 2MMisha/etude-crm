import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useCashMonths, addCashOperation } from "@/lib/data/cash";
import { useClients } from "@/lib/data/clients";
import { useSettings } from "@/lib/data/settings";
import { refreshDerivedBalances } from "@/lib/data/recalc";
import { QueryState } from "@/components/QueryState";
import { CASH_OPERATION_TYPE_LABEL } from "@/lib/labels";
import { todayDateString } from "@/lib/dates";
import type { CashOperation, CashOperationType } from "@/schemas/cashMonth";
import type { Client } from "@/schemas/client";
import type { Settings } from "@/schemas/settings";

export const Route = createFileRoute("/admin/cash/")({
  component: CashScreen,
});

function CashScreen() {
  const cashQuery = useCashMonths();
  const clientsQuery = useClients();
  const settingsQuery = useSettings();

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900">Касса</h1>
      <QueryState query={clientsQuery} loadingLabel="Загружаю…">
        {(clients) => (
          <QueryState query={settingsQuery}>
            {(settings) => (
              <QueryState query={cashQuery}>{(cashMonths) => <CashPanel clients={clients} settings={settings} operations={cashMonths.flatMap((m) => m.operations)} />}</QueryState>
            )}
          </QueryState>
        )}
      </QueryState>
    </div>
  );
}

function CashPanel({ clients, settings, operations }: { clients: Client[]; settings: Settings | null; operations: CashOperation[] }) {
  const queryClient = useQueryClient();
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const sorted = [...operations].sort((a, b) => b.date.localeCompare(a.date));

  const [date, setDate] = useState(todayDateString());
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState<CashOperationType>("topup");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const operation: CashOperation = {
        id: crypto.randomUUID(),
        date,
        clientId,
        type,
        category: type === "otherCharge" ? category || null : null,
        amount: Number(amount),
        method,
        docNumber,
        notes,
      };
      await addCashOperation(operation);
      await refreshDerivedBalances();
      await queryClient.invalidateQueries({ queryKey: ["cash"] });
      await queryClient.invalidateQueries({ queryKey: ["derivedBalances"] });
      setClientId("");
      setAmount("");
      setDocNumber("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 max-w-3xl">
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500">Операций пока нет.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2 pr-4">Дата</th>
              <th className="py-2 pr-4">Клиент</th>
              <th className="py-2 pr-4">Тип</th>
              <th className="py-2 pr-4">Сумма</th>
              <th className="py-2 pr-4">Способ</th>
              <th className="py-2 pr-4">Документ</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((op) => (
              <tr key={op.id} className="border-b border-gray-100">
                <td className="py-2 pr-4 text-gray-500">{op.date}</td>
                <td className="py-2 pr-4">{clientById.get(op.clientId)?.name ?? op.clientId}</td>
                <td className="py-2 pr-4">{CASH_OPERATION_TYPE_LABEL[op.type] ?? op.type}</td>
                <td className={`py-2 pr-4 ${op.type === "topup" || op.type === "adjustPlus" ? "text-green-700" : "text-red-700"}`}>
                  {op.type === "topup" || op.type === "adjustPlus" ? "+" : "−"}
                  {op.amount}₪
                </td>
                <td className="py-2 pr-4">{op.method}</td>
                <td className="py-2 pr-4">{op.docNumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={handleSubmit} className="mt-6 rounded border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-900">Новая операция</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="rounded border border-gray-300 px-2 py-1.5" />
          <select required value={clientId} onChange={(e) => setClientId(e.target.value)} className="rounded border border-gray-300 px-2 py-1.5">
            <option value="">Клиент…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value as CashOperationType)} className="rounded border border-gray-300 px-2 py-1.5">
            {Object.entries(CASH_OPERATION_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {type === "otherCharge" && (
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded border border-gray-300 px-2 py-1.5">
              <option value="">Категория…</option>
              {(settings?.otherCategories ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <input
            type="number"
            required
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Сумма ₪"
            className="w-28 rounded border border-gray-300 px-2 py-1.5"
          />
          <input type="text" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Способ оплаты" className="rounded border border-gray-300 px-2 py-1.5" />
          <input type="text" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="№ документа" className="rounded border border-gray-300 px-2 py-1.5" />
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Примечание" className="rounded border border-gray-300 px-2 py-1.5" />
          <button type="submit" disabled={saving} className="rounded bg-gray-900 px-3 py-1.5 font-medium text-white disabled:opacity-50">
            {saving ? "Сохраняю…" : "Добавить"}
          </button>
        </div>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
