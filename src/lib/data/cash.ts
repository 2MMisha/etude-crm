import { useQuery } from "@tanstack/react-query";
import { cashMonthSchema, type CashMonth, type CashOperation } from "@/schemas/cashMonth";
import { appendToMonthFile, listCollection } from "./repo";

export function listCashMonths(): Promise<CashMonth[]> {
  return listCollection("cash", cashMonthSchema);
}

export function useCashMonths() {
  return useQuery({ queryKey: ["cash"], queryFn: listCashMonths });
}

export async function addCashOperation(operation: CashOperation): Promise<void> {
  const month = operation.date.slice(0, 7);
  await appendToMonthFile(
    `cash/${month}.json`,
    cashMonthSchema,
    () => ({ month, operations: [] }),
    (base, item: CashOperation) => ({ ...base, operations: [...base.operations, item] }),
    operation,
    `Касса: ${operation.type} ${operation.amount}₪ (${operation.clientId})`,
  );
}
