import { getJsonFile, putJsonFile, ConflictError } from "@/lib/github/contentsApi";
import { dataRef } from "@/lib/data/repo";
import { attendanceMonthSchema, type AttendanceMonth } from "@/schemas/attendanceMonth";
import { offlineDb, type PendingSession } from "./db";

const MAX_RETRIES = 3;

/**
 * Flushes queued attendance sessions (§6.3) to etude-crm-data — one PUT per
 * month touched, however many sessions are queued for it. On a 409 (§6.4),
 * refetches the current file and merges by sessionId+studentId before
 * retrying, so a concurrent write to a different session/student is never
 * silently dropped.
 */
export async function syncPendingAttendance(): Promise<{ synced: number; failed: number }> {
  const pending = await offlineDb.pendingSessions.toArray();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  const months = [...new Set(pending.map((p) => p.month))];
  let synced = 0;
  let failed = 0;

  for (const month of months) {
    const forMonth = pending.filter((p) => p.month === month);
    const ok = await syncMonth(month, forMonth);
    if (ok) synced += forMonth.length;
    else failed += forMonth.length;
  }

  return { synced, failed };
}

async function syncMonth(month: string, sessions: PendingSession[], attempt = 0): Promise<boolean> {
  const ref = dataRef();
  const path = `attendance/${month}.json`;

  try {
    const existing = await getJsonFile<AttendanceMonth>(ref, path);
    const base: AttendanceMonth = existing ? attendanceMonthSchema.parse(existing.data) : { month, sessions: [] };
    const merged = mergeSessions(base, sessions);

    await putJsonFile(ref, path, merged, existing?.sha ?? null, `Посещаемость ${month}: ${sessions.length} занятие(й)`);
    await offlineDb.pendingSessions.bulkDelete(sessions.map((s) => s.sessionId));
    return true;
  } catch (err) {
    if (err instanceof ConflictError && attempt < MAX_RETRIES) {
      return syncMonth(month, sessions, attempt + 1);
    }
    return false;
  }
}

function mergeSessions(base: AttendanceMonth, pending: PendingSession[]): AttendanceMonth {
  const sessions = base.sessions.map((s) => ({ ...s, marks: { ...s.marks } }));

  for (const p of pending) {
    const index = sessions.findIndex((s) => s.id === p.sessionId);
    if (index === -1) {
      sessions.push({
        id: p.sessionId,
        date: p.date,
        groupId: p.groupId,
        teacherId: p.teacherId,
        marks: { ...p.marks },
        recordedBy: p.recordedBy,
        recordedAt: p.recordedAt,
      });
    } else {
      sessions[index] = {
        ...sessions[index],
        marks: { ...sessions[index].marks, ...p.marks },
        recordedBy: p.recordedBy,
        recordedAt: p.recordedAt,
      };
    }
  }

  return { month: base.month, sessions };
}
