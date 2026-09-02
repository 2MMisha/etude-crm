import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

/** Centralizes the loading/error boilerplate every list/detail screen needs around a query. */
export function QueryState<T>({
  query,
  loadingLabel = "Загрузка…",
  children,
}: {
  query: UseQueryResult<T>;
  loadingLabel?: string;
  children: (data: T) => ReactNode;
}) {
  if (query.isLoading) return <div className="p-6 text-sm text-gray-500">{loadingLabel}</div>;
  if (query.isError) {
    return (
      <div className="p-6 text-sm text-red-600">
        Не удалось загрузить данные: {query.error instanceof Error ? query.error.message : String(query.error)}
      </div>
    );
  }
  if (query.data === undefined) return null;
  return <>{children(query.data)}</>;
}
