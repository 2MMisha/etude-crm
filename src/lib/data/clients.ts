import { useQuery } from "@tanstack/react-query";
import { clientSchema, type Client } from "@/schemas/client";
import { getDocument, listCollection } from "./repo";

export function listClients(): Promise<Client[]> {
  return listCollection("clients", clientSchema);
}

export function getClient(id: string): Promise<Client | null> {
  return getDocument(`clients/${id}.json`, clientSchema);
}

export function useClients() {
  return useQuery({ queryKey: ["clients"], queryFn: listClients });
}

export function useClient(id: string) {
  return useQuery({ queryKey: ["clients", id], queryFn: () => getClient(id) });
}
