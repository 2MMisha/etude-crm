import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLessonsMonths, addLesson } from "@/lib/data/lessons";
import { useStudents } from "@/lib/data/students";
import { useSettings } from "@/lib/data/settings";
import { refreshDerivedBalances } from "@/lib/data/recalc";
import { QueryState } from "@/components/QueryState";
import { LESSON_STATUS_LABEL } from "@/lib/labels";
import { todayDateString } from "@/lib/dates";
import type { Lesson, LessonParticipant, LessonStatus } from "@/schemas/lessonsMonth";
import type { Settings } from "@/schemas/settings";
import type { Student } from "@/schemas/student";

export const Route = createFileRoute("/admin/lessons/")({
  component: LessonsScreen,
});

function LessonsScreen() {
  const lessonsQuery = useLessonsMonths();
  const studentsQuery = useStudents();
  const settingsQuery = useSettings();

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-900">Индивидуальные</h1>
      <QueryState query={studentsQuery} loadingLabel="Загружаю…">
        {(students) => (
          <QueryState query={settingsQuery}>
            {(settings) => (
              <QueryState query={lessonsQuery}>
                {(lessonsMonths) => <LessonsPanel students={students} settings={settings} lessons={lessonsMonths.flatMap((m) => m.lessons)} />}
              </QueryState>
            )}
          </QueryState>
        )}
      </QueryState>
    </div>
  );
}

interface ParticipantRow {
  studentId: string;
  share: string;
}

function LessonsPanel({ students, settings, lessons }: { students: Student[]; settings: Settings | null; lessons: Lesson[] }) {
  const queryClient = useQueryClient();
  const studentById = new Map(students.map((s) => [s.id, s]));
  const teacherNameById = new Map((settings?.teachers ?? []).map((t) => [t.id, t.name]));
  const sorted = [...lessons].sort((a, b) => b.date.localeCompare(a.date));

  const [date, setDate] = useState(todayDateString());
  const [teacherId, setTeacherId] = useState("");
  const [minutes, setMinutes] = useState(String(settings?.baseLessonMinutes ?? 45));
  const [status, setStatus] = useState<LessonStatus>("held");
  const [participants, setParticipants] = useState<ParticipantRow[]>([{ studentId: "", share: "1" }]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateParticipant(index: number, patch: Partial<ParticipantRow>) {
    setParticipants((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const validParticipants: LessonParticipant[] = participants
        .filter((p) => p.studentId)
        .map((p) => ({ studentId: p.studentId, share: Number(p.share) }));
      if (validParticipants.length === 0) throw new Error("Добавьте хотя бы одного участника.");

      const lesson: Lesson = { id: crypto.randomUUID(), date, teacherId, minutes: Number(minutes), status, participants: validParticipants, notes };
      await addLesson(lesson);
      await refreshDerivedBalances();
      await queryClient.invalidateQueries({ queryKey: ["lessons"] });
      await queryClient.invalidateQueries({ queryKey: ["derivedBalances"] });
      setParticipants([{ studentId: "", share: "1" }]);
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
        <p className="text-sm text-gray-500">Уроков пока нет.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2 pr-4">Дата</th>
              <th className="py-2 pr-4">Педагог</th>
              <th className="py-2 pr-4">Мин</th>
              <th className="py-2 pr-4">Статус</th>
              <th className="py-2 pr-4">Участники</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((l) => (
              <tr key={l.id} className="border-b border-gray-100">
                <td className="py-2 pr-4 text-gray-500">{l.date}</td>
                <td className="py-2 pr-4">{teacherNameById.get(l.teacherId) ?? l.teacherId}</td>
                <td className="py-2 pr-4">{l.minutes}</td>
                <td className="py-2 pr-4">{LESSON_STATUS_LABEL[l.status] ?? l.status}</td>
                <td className="py-2 pr-4">
                  {l.participants.map((p) => `${studentById.get(p.studentId)?.name ?? p.studentId} (${p.share})`).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={handleSubmit} className="mt-6 rounded border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-900">Новый урок</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="rounded border border-gray-300 px-2 py-1.5" />
          <select required value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="rounded border border-gray-300 px-2 py-1.5">
            <option value="">Педагог…</option>
            {(settings?.teachers ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input type="number" required min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-20 rounded border border-gray-300 px-2 py-1.5" />
          <select value={status} onChange={(e) => setStatus(e.target.value as LessonStatus)} className="rounded border border-gray-300 px-2 py-1.5">
            {Object.entries(LESSON_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Примечание" className="rounded border border-gray-300 px-2 py-1.5" />
        </div>

        <div className="mt-3 space-y-2">
          {participants.map((row, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <select value={row.studentId} onChange={(e) => updateParticipant(i, { studentId: e.target.value })} className="rounded border border-gray-300 px-2 py-1.5">
                <option value="">Ученик…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.1"
                min={0}
                value={row.share}
                onChange={(e) => updateParticipant(i, { share: e.target.value })}
                className="w-20 rounded border border-gray-300 px-2 py-1.5"
                title="Доля стоимости"
              />
              {participants.length > 1 && (
                <button type="button" onClick={() => setParticipants((rows) => rows.filter((_, idx) => idx !== i))} className="text-red-600 hover:underline">
                  Убрать
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => setParticipants((rows) => [...rows, { studentId: "", share: "1" }])} className="text-sm text-gray-600 hover:underline">
            + Добавить участника
          </button>
        </div>

        <button type="submit" disabled={saving} className="mt-4 rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {saving ? "Сохраняю…" : "Добавить"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
