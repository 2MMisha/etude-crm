import { useQuery } from "@tanstack/react-query";
import { settingsSchema, type Settings } from "@/schemas/settings";
import { getDocument } from "./repo";

export function getSettings(): Promise<Settings | null> {
  return getDocument("settings.json", settingsSchema);
}

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: getSettings });
}
