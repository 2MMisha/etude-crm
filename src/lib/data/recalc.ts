import { recalcBalances } from "@/domain/recalcBalances";
import { listClients } from "./clients";
import { listStudents } from "./students";
import { getSettings } from "./settings";
import { listCashMonths } from "./cash";
import { listChargesMonths } from "./charges";
import { listLessonsMonths } from "./lessons";
import { saveDerivedBalances } from "./derivedBalances";

/**
 * recalc-balances.yml equivalent (§5.2) — called after any write that could
 * move a balance (cash, lessons, charges) instead of on a schedule, since
 * everything here runs from the admin's own browser rather than an Action.
 */
export async function refreshDerivedBalances(): Promise<void> {
  const [clients, students, settings, cashMonths, chargesMonths, lessonsMonths] = await Promise.all([
    listClients(),
    listStudents(),
    getSettings(),
    listCashMonths(),
    listChargesMonths(),
    listLessonsMonths(),
  ]);
  if (!settings) return;

  const result = recalcBalances({
    computedAt: new Date().toISOString(),
    clients,
    students,
    settings,
    cashMonths,
    chargesMonths,
    lessonsMonths,
  });
  await saveDerivedBalances(result);
}
