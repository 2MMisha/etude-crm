import { useQuery } from "@tanstack/react-query";
import { groupSchema, type Group } from "@/schemas/group";
import { getDocument, listCollection } from "./repo";

export function listGroups(): Promise<Group[]> {
  return listCollection("groups", groupSchema);
}

export function getGroup(id: string): Promise<Group | null> {
  return getDocument(`groups/${id}.json`, groupSchema);
}

export function useGroups() {
  return useQuery({ queryKey: ["groups"], queryFn: listGroups });
}
