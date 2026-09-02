import Dexie, { type Table } from "dexie";
import type { AttendanceMark } from "@/schemas/attendanceMonth";

/**
 * Queued attendance writes (§6.3). One row per session (group + date) — the
 * whole group's marks are one row, matching §2.3's "one action = one commit"
 * rule (marking a group is one PUT, not one per student). `sessionId` is the
 * primary key, so re-saving before sync just replaces the pending row.
 */
export interface PendingSession {
  sessionId: string;
  month: string;
  date: string;
  groupId: string;
  teacherId: string;
  marks: Record<string, AttendanceMark>;
  recordedBy: string;
  recordedAt: string;
}

class OfflineDb extends Dexie {
  pendingSessions!: Table<PendingSession, string>;

  constructor() {
    super("etude-crm-offline");
    this.version(1).stores({
      pendingSessions: "sessionId, month",
    });
  }
}

export const offlineDb = new OfflineDb();
