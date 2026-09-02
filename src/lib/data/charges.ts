import { useQuery } from "@tanstack/react-query";
import { chargesMonthSchema, type ChargesMonth, type Charge } from "@/schemas/chargesMonth";
import { getDocument, listCollection, saveDocument } from "./repo";

export function listChargesMonths(): Promise<ChargesMonth[]> {
  return listCollection("charges", chargesMonthSchema);
}

export function useChargesMonths() {
  return useQuery({ queryKey: ["charges"], queryFn: listChargesMonths });
}

export function getChargesMonth(month: string): Promise<ChargesMonth | null> {
  return getDocument(`charges/${month}.json`, chargesMonthSchema);
}

export function useChargesMonth(month: string) {
  return useQuery({ queryKey: ["charges", month], queryFn: () => getChargesMonth(month) });
}

/** close-month.yml equivalent (§5.1) — run client-side by the admin instead of a scheduled Action. */
export async function saveChargesMonth(month: string, charges: Charge[]): Promise<void> {
  await saveDocument(`charges/${month}.json`, chargesMonthSchema, { month, charges }, `Начисления за ${month}`);
}
