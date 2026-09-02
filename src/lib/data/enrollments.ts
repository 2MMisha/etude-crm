import { useQuery } from "@tanstack/react-query";
import { enrollmentSchema, type Enrollment } from "@/schemas/enrollment";
import { listCollection } from "./repo";

export function listEnrollments(): Promise<Enrollment[]> {
  return listCollection("enrollments", enrollmentSchema);
}

export function useEnrollments() {
  return useQuery({ queryKey: ["enrollments"], queryFn: listEnrollments });
}
