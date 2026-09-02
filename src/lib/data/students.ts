import { useQuery } from "@tanstack/react-query";
import { studentSchema, type Student } from "@/schemas/student";
import { getDocument, listCollection } from "./repo";

export function listStudents(): Promise<Student[]> {
  return listCollection("students", studentSchema);
}

export function getStudent(id: string): Promise<Student | null> {
  return getDocument(`students/${id}.json`, studentSchema);
}

export function useStudents() {
  return useQuery({ queryKey: ["students"], queryFn: listStudents });
}
