import { useQuery } from "@tanstack/react-query";
import { derivedBalancesSchema, type DerivedBalances } from "@/schemas/derivedBalances";
import { getDocument, saveDocument } from "./repo";

const PATH = "derived/balances.json";

export function getDerivedBalances(): Promise<DerivedBalances | null> {
  return getDocument(PATH, derivedBalancesSchema);
}

export function useDerivedBalances() {
  return useQuery({ queryKey: ["derivedBalances"], queryFn: getDerivedBalances });
}

/** recalc-balances.yml equivalent (§5.2) — run client-side after any cash/lesson/charge write. */
export async function saveDerivedBalances(data: DerivedBalances): Promise<void> {
  await saveDocument(PATH, derivedBalancesSchema, data, "Пересчитаны балансы");
}
