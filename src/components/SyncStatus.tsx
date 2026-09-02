import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { offlineDb } from "@/lib/offline/db";
import { syncPendingAttendance } from "@/lib/offline/syncAttendance";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";

/** Always-visible sync indicator (§6.3) — the teacher must always know whether today's marks made it out. */
export function SyncStatus() {
  const pendingCount = useLiveQuery(() => offlineDb.pendingSessions.count(), [], 0);
  const online = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);

  async function sync() {
    setSyncing(true);
    try {
      await syncPendingAttendance();
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    if (online) void sync();
  }, [online]);

  if (!pendingCount && online) {
    return <span className="text-xs text-gray-400">В сети</span>;
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={online ? "text-gray-500" : "font-medium text-amber-600"}>{online ? "В сети" : "Офлайн"}</span>
      {pendingCount > 0 && (
        <button
          type="button"
          onClick={sync}
          disabled={syncing || !online}
          className="rounded bg-gray-100 px-2 py-1 text-gray-700 disabled:opacity-50"
        >
          {syncing ? "Синхронизация…" : `Не отправлено: ${pendingCount}`}
        </button>
      )}
    </div>
  );
}
