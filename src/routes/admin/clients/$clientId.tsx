import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useClient } from "@/lib/data/clients";
import { useStudents } from "@/lib/data/students";
import { useGroups } from "@/lib/data/groups";
import { useEnrollments } from "@/lib/data/enrollments";
import { useCashMonths } from "@/lib/data/cash";
import { useChargesMonths } from "@/lib/data/charges";
import { useLessonsMonths } from "@/lib/data/lessons";
import { useSettings } from "@/lib/data/settings";
import { useDerivedBalances } from "@/lib/data/derivedBalances";
import { computeLessonCost, computeParticipantCharge, isLessonChargeable } from "@/domain/lessonCharge";
import { QueryState } from "@/components/QueryState";
import { CASH_OPERATION_TYPE_LABEL, CLIENT_STATUS_LABEL, CLIENT_TYPE_LABEL, STUDENT_STATUS_LABEL } from "@/lib/labels";
import type { Client } from "@/schemas/client";
import type { Student } from "@/schemas/student";
import type { Group } from "@/schemas/group";
import type { Enrollment } from "@/schemas/enrollment";
import type { CashMonth } from "@/schemas/cashMonth";
import type { ChargesMonth } from "@/schemas/chargesMonth";
import type { LessonsMonth } from "@/schemas/lessonsMonth";
import type { Settings } from "@/schemas/settings";
import type { ClientBalance } from "@/schemas/derivedBalances";

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
  const cashQuery = useCashMonths();
  const chargesQuery = useChargesMonths();
  const lessonsQuery = useLessonsMonths();
  const settingsQuery = useSettings();
  const balancesQuery = useDerivedBalances();

  return (
    <div className="p-6">
      <Link to="/admin/clients" className="text-sm text-gray-500 hover:underline print:hidden">
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
                        <QueryState query={cashQuery}>
                          {(cashMonths) => (
                            <QueryState query={chargesQuery}>
                              {(chargesMonths) => (
                                <QueryState query={lessonsQuery}>
                                  {(lessonsMonths) => (
                                    <QueryState query={settingsQuery}>
                                      {(settings) => (
                                        <QueryState query={balancesQuery}>
                                          {(derived) => (
                                            <ClientCard
                                              client={client}
                                              students={students.filter((s) => s.clientId === client.id)}
                                              groups={groups}
                                              enrollments={enrollments}
                                              cashMonths={cashMonths}
                                              chargesMonths={chargesMonths}
                                              lessonsMonths={lessonsMonths}
                                              settings={settings}
                                              balance={derived?.balances.find((b) => b.clientId === client.id) ?? null}
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
              )}
            </QueryState>
          )
        }
      </QueryState>
    </div>
  );
}

interface StatementEntry {
  date: string;
  label: string;
  amount: number;
}

function ClientCard({
  client,
  students,
  groups,
  enrollments,
  cashMonths,
  chargesMonths,
  lessonsMonths,
  settings,
  balance,
}: {
  client: Client;
  students: Student[];
  groups: Group[];
  enrollments: Enrollment[];
  cashMonths: CashMonth[];
  chargesMonths: ChargesMonth[];
  lessonsMonths: LessonsMonth[];
  settings: Settings | null;
  balance: ClientBalance | null;
}) {
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const studentIds = new Set(students.map((s) => s.id));
  const studentById = new Map(students.map((s) => [s.id, s]));
  const teacherRateById = new Map((settings?.teachers ?? []).map((t) => [t.id, t.privateRate45]));

  const statement = useMemo<StatementEntry[]>(() => {
    const entries: StatementEntry[] = [];

    for (const month of cashMonths) {
      for (const op of month.operations) {
        if (op.clientId !== client.id) continue;
        const sign = op.type === "topup" || op.type === "adjustPlus" ? 1 : -1;
        const label = CASH_OPERATION_TYPE_LABEL[op.type] ?? op.type;
        entries.push({ date: op.date, label: op.category ? `${label} (${op.category})` : label, amount: sign * op.amount });
      }
    }

    for (const month of chargesMonths) {
      for (const charge of month.charges) {
        if (!studentIds.has(charge.studentId)) continue;
        const group = groupById.get(charge.groupId);
        const student = studentById.get(charge.studentId);
        entries.push({ date: `${month.month}-01`, label: `Группа «${group?.name ?? charge.groupId}» — ${student?.name ?? charge.studentId}`, amount: -charge.charge });
      }
    }

    if (settings) {
      for (const month of lessonsMonths) {
        for (const lesson of month.lessons) {
          if (!isLessonChargeable(lesson.status)) continue;
          const rate = teacherRateById.get(lesson.teacherId) ?? 0;
          const lessonCost = computeLessonCost({ privateRate45: rate, minutes: lesson.minutes, baseLessonMinutes: settings.baseLessonMinutes });
          for (const participant of lesson.participants) {
            if (!studentIds.has(participant.studentId)) continue;
            const amount = computeParticipantCharge(lessonCost, participant.share);
            if (amount === 0) continue;
            entries.push({ date: lesson.date, label: `Индивидуальный урок — ${studentById.get(participant.studentId)?.name ?? participant.studentId}`, amount: -amount });
          }
        }
      }
    }

    return entries.sort((a, b) => a.date.localeCompare(b.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id, cashMonths, chargesMonths, lessonsMonths, settings]);

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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Баланс</h2>
          <button type="button" onClick={() => window.print()} className="text-xs text-gray-500 hover:underline print:hidden">
            Печать
          </button>
        </div>
        {balance === null ? (
          <p className="mt-1 text-sm text-gray-500">Ещё не рассчитан — нажмите «Пересчитать месяц» в Начислениях или добавьте операцию в Кассе.</p>
        ) : (
          <p className={`mt-1 text-2xl font-semibold ${balance.balance < 0 ? "text-red-600" : "text-gray-900"}`}>{balance.balance}₪</p>
        )}
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

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-gray-900">Выписка</h2>
        {statement.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">Движений пока нет.</p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <tbody>
              {statement.map((entry, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5 pr-4 text-gray-500">{entry.date}</td>
                  <td className="py-1.5 pr-4">{entry.label}</td>
                  <td className={`py-1.5 text-right ${entry.amount < 0 ? "text-red-700" : "text-green-700"}`}>
                    {entry.amount > 0 ? "+" : ""}
                    {entry.amount}₪
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
