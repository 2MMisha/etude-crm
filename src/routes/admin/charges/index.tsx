import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useEnrollments } from "@/lib/data/enrollments";
import { useGroups } from "@/lib/data/groups";
import { useStudents } from "@/lib/data/students";
import { useClients } from "@/lib/data/clients";
import { useSettings } from "@/lib/data/settings";
import { useAttendanceMonth } from "@/lib/data/attendance";
import { useChargesMonth, saveChargesMonth } from "@/lib/data/charges";
import { refreshDerivedBalances } from "@/lib/data/recalc";
import { closeMonth } from "@/domain/closeMonth";
import { QueryState } from "@/components/QueryState";
import { monthOf, todayDateString } from "@/lib/dates";
import type { Charge } from "@/schemas/chargesMonth";
import type { Enrollment } from "@/schemas/enrollment";
import type { Group } from "@/schemas/group";
import type { Student } from "@/schemas/student";
import type { Client } from "@/schemas/client";
import type { Settings } from "@/schemas/settings";
import type { AttendanceMonth } from "@/schemas/attendanceMonth";

export const Route = createFileRoute("/admin/charges/")({
  component: ChargesScreen,
});

function previousMonth(): string {
  const [y, m] = monthOf(todayDateString()).split("-").map(Number);
  const d = new Date(y, m - 2, 1); // m is 1-based; m-2 = previous month, 0-based
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ChargesScreen() {
  const [month, setMonth] = useState(previousMonth());

  const enrollmentsQuery = useEnrollments();
  const groupsQuery = useGroups();
  const studentsQuery = useStudents();
  const clientsQuery = useClients();
  const settingsQuery = useSettings();
  const attendanceQuery = useAttendanceMonth(month);
  const chargesQuery = useChargesMonth(month);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900">Начисления</h1>
      <label className="mt-4 block text-sm text-gray-500">
        Месяц{" "}
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="ml-1 rounded border border-gray-300 px-2 py-1" />
      </label>

      <QueryState query={enrollmentsQuery} loadingLabel="Загружаю…">
        {(enrollments) => (
          <QueryState query={groupsQuery}>
            {(groups) => (
              <QueryState query={studentsQuery}>
                {(students) => (
                  <QueryState query={clientsQuery}>
                    {(clients) => (
                      <QueryState query={settingsQuery}>
                        {(settings) => (
                          <QueryState query={attendanceQuery}>
                            {(attendance) => (
                              <QueryState query={chargesQuery}>
                                {(charges) => (
                                  <ChargesPanel
                                    month={month}
                                    enrollments={enrollments}
                                    groups={groups}
                                    students={students}
                                    clients={clients}
                                    settings={settings}
                                    attendance={attendance}
                                    charges={charges?.charges ?? []}
                                  />
                                )}
                              </QueryState>
                            )}
                          </QueryState>
                        )}
                      </QueryState>
                    )}
                  </QueryState>
                )}
              </QueryState>
            )}
          </QueryState>
        )}
      </QueryState>
    </div>
  );
}

function ChargesPanel({
  month,
  enrollments,
  groups,
  students,
  clients,
  settings,
  attendance,
  charges,
}: {
  month: string;
  enrollments: Enrollment[];
  groups: Group[];
  students: Student[];
  clients: Client[];
  settings: Settings | null;
  attendance: AttendanceMonth | null;
  charges: Charge[];
}) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [overrideValue, setOverrideValue] = useState("");

  const groupById = new Map(groups.map((g) => [g.id, g]));
  const studentById = new Map(students.map((s) => [s.id, s]));

  async function recompute() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const next = closeMonth({ month, today: new Date(), enrollments, groups, students, clients, settings, attendance, existingCharges: charges });
      await saveChargesMonth(month, next);
      await refreshDerivedBalances();
      await queryClient.invalidateQueries({ queryKey: ["charges"] });
      await queryClient.invalidateQueries({ queryKey: ["derivedBalances"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveOverride(enrollmentId: string) {
    setSaving(true);
    setError(null);
    try {
      const value = overrideValue === "" ? null : Number(overrideValue);
      const next = charges.map((c) => (c.enrollmentId === enrollmentId ? { ...c, manualOverride: value, charge: value ?? c.base * (1 - c.discount) } : c));
      await saveChargesMonth(month, next);
      await refreshDerivedBalances();
      await queryClient.invalidateQueries({ queryKey: ["charges"] });
      await queryClient.invalidateQueries({ queryKey: ["derivedBalances"] });
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const total = charges.reduce((sum, c) => sum + c.charge, 0);

  return (
    <div className="mt-4 max-w-3xl">
      <button type="button" onClick={recompute} disabled={saving || !settings} className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
        {saving ? "Считаю…" : "Пересчитать месяц"}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {charges.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">Начислений за этот месяц ещё нет — нажмите «Пересчитать месяц».</p>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2 pr-4">Ученик</th>
              <th className="py-2 pr-4">Группа</th>
              <th className="py-2 pr-4">Был/Всего</th>
              <th className="py-2 pr-4">База</th>
              <th className="py-2 pr-4">Скидка</th>
              <th className="py-2 pr-4">Начислено</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {charges.map((c) => (
              <tr key={c.enrollmentId} className="border-b border-gray-100">
                <td className="py-2 pr-4">{studentById.get(c.studentId)?.name ?? c.studentId}</td>
                <td className="py-2 pr-4">{groupById.get(c.groupId)?.name ?? c.groupId}</td>
                <td className="py-2 pr-4">
                  {c.went}/{c.held}
                </td>
                <td className="py-2 pr-4">{c.base}₪</td>
                <td className="py-2 pr-4">{Math.round(c.discount * 100)}%</td>
                <td className="py-2 pr-4 font-medium">
                  {editingId === c.enrollmentId ? (
                    <span className="flex items-center gap-1">
                      <input
                        type="number"
                        autoFocus
                        value={overrideValue}
                        onChange={(e) => setOverrideValue(e.target.value)}
                        className="w-20 rounded border border-gray-300 px-1 py-0.5"
                      />
                      <button type="button" onClick={() => saveOverride(c.enrollmentId)} className="text-xs text-gray-700 hover:underline">
                        ✓
                      </button>
                    </span>
                  ) : (
                    <>
                      {c.charge}₪ {c.manualOverride !== null && <span className="text-xs text-amber-600">(вручную)</span>}
                    </>
                  )}
                </td>
                <td className="py-2 pr-4">
                  {editingId !== c.enrollmentId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(c.enrollmentId);
                        setOverrideValue(c.manualOverride !== null ? String(c.manualOverride) : "");
                      }}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Изменить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="pt-3 text-right font-medium text-gray-500">
                Итого
              </td>
              <td className="pt-3 font-semibold">{total}₪</td>
              <td />
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}
