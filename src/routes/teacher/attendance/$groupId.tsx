import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useGroups } from "@/lib/data/groups";
import { useStudents } from "@/lib/data/students";
import { useEnrollments } from "@/lib/data/enrollments";
import { useAttendanceMonth } from "@/lib/data/attendance";
import { isEnrollmentActiveOn } from "@/domain/enrollment";
import { monthOf, sessionId as buildSessionId, todayDateString } from "@/lib/dates";
import { offlineDb } from "@/lib/offline/db";
import { syncPendingAttendance } from "@/lib/offline/syncAttendance";
import { QueryState } from "@/components/QueryState";
import type { AttendanceMark } from "@/schemas/attendanceMonth";
import type { Student } from "@/schemas/student";

export const Route = createFileRoute("/teacher/attendance/$groupId")({
  validateSearch: (search: Record<string, unknown>): { date: string } => ({
    date: typeof search.date === "string" ? search.date : todayDateString(),
  }),
  component: AttendanceMarkScreen,
});

const MARK_OPTIONS: { value: AttendanceMark; label: string }[] = [
  { value: "present", label: "Был" },
  { value: "absent", label: "Не был" },
  { value: "makeup", label: "Отработка" },
  { value: "cancelledByStudio", label: "Отменено" },
];

function AttendanceMarkScreen() {
  const { groupId } = Route.useParams();
  const { date } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { session } = useAuth();

  const groupsQuery = useGroups();
  const studentsQuery = useStudents();
  const enrollmentsQuery = useEnrollments();
  const attendanceQuery = useAttendanceMonth(monthOf(date));

  const sid = buildSessionId(date, groupId);
  const pending = useLiveQuery(() => offlineDb.pendingSessions.get(sid), [sid], null);

  return (
    <div className="p-6">
      <button onClick={() => navigate({ to: "/teacher/attendance" })} className="text-sm text-gray-500 hover:underline">
        ← Посещаемость
      </button>

      <div className="mt-2 flex items-center gap-3">
        <label className="text-sm text-gray-500">
          Дата{" "}
          <input
            type="date"
            value={date}
            onChange={(e) => navigate({ search: { date: e.target.value } })}
            className="ml-1 rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
      </div>

      <QueryState query={groupsQuery} loadingLabel="Загружаю…">
        {(groups) => {
          const group = groups.find((g) => g.id === groupId);
          if (!group) return <p className="mt-4 text-sm text-red-600">Группа не найдена.</p>;
          return (
            <QueryState query={studentsQuery}>
              {(students) => (
                <QueryState query={enrollmentsQuery}>
                  {(enrollments) => (
                    <QueryState query={attendanceQuery}>
                      {(attendanceMonth) => {
                        const roster = enrollments
                          .filter((e) => e.groupId === groupId && isEnrollmentActiveOn(e, date))
                          .map((e) => students.find((s) => s.id === e.studentId))
                          .filter((s): s is Student => s !== undefined)
                          .sort((a, b) => a.name.localeCompare(b.name));

                        const remoteMarks = attendanceMonth?.sessions.find((s) => s.id === sid)?.marks ?? {};

                        return (
                          <MarkingPanel
                            groupName={group.name}
                            teacherId={session?.teacherId ?? ""}
                            username={session?.username ?? ""}
                            date={date}
                            groupId={groupId}
                            sessionId={sid}
                            roster={roster}
                            remoteMarks={remoteMarks}
                            pendingMarks={pending?.marks ?? null}
                          />
                        );
                      }}
                    </QueryState>
                  )}
                </QueryState>
              )}
            </QueryState>
          );
        }}
      </QueryState>
    </div>
  );
}

function MarkingPanel({
  groupName,
  teacherId,
  username,
  date,
  groupId,
  sessionId,
  roster,
  remoteMarks,
  pendingMarks,
}: {
  groupName: string;
  teacherId: string;
  username: string;
  date: string;
  groupId: string;
  sessionId: string;
  roster: Student[];
  remoteMarks: Record<string, AttendanceMark>;
  pendingMarks: Record<string, AttendanceMark> | null;
}) {
  const [marks, setMarks] = useState<Record<string, AttendanceMark>>({});
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (initializedFor === sessionId) return;
    setMarks({ ...remoteMarks, ...(pendingMarks ?? {}) });
    setInitializedFor(sessionId);
    // Only re-seed when we switch to a different session (date/group) — not on every background refetch,
    // or a teacher's in-progress taps would get clobbered by the query revalidating underneath them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function handleSave() {
    setSaved(false);
    await offlineDb.pendingSessions.put({
      sessionId,
      month: monthOf(date),
      date,
      groupId,
      teacherId,
      marks,
      recordedBy: username,
      recordedAt: new Date().toISOString(),
    });
    setSaved(true);
    void syncPendingAttendance();
  }

  return (
    <div className="mt-4 max-w-xl">
      <h1 className="text-lg font-semibold text-gray-900">{groupName}</h1>
      <p className="text-sm text-gray-500">{date}</p>

      {roster.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">Нет учеников с активной записью на эту дату.</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100">
          {roster.map((student) => (
            <li key={student.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="font-medium text-gray-900">{student.name}</span>
              <div className="flex gap-1">
                {MARK_OPTIONS.map((opt) => {
                  const active = marks[student.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMarks((m) => ({ ...m, [student.id]: opt.value }))}
                      className={`rounded px-3 py-2 text-sm ${
                        active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}

      {roster.length > 0 && (
        <button
          type="button"
          onClick={handleSave}
          className="mt-4 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          Сохранить
        </button>
      )}
      {saved && <p className="mt-2 text-sm text-green-700">Сохранено — статус отправки см. вверху.</p>}
    </div>
  );
}
