import { useQuery } from "@tanstack/react-query";
import { attendanceMonthSchema, type AttendanceMonth } from "@/schemas/attendanceMonth";
import { getDocument } from "./repo";

export function getAttendanceMonth(month: string): Promise<AttendanceMonth | null> {
  return getDocument(`attendance/${month}.json`, attendanceMonthSchema);
}

export function useAttendanceMonth(month: string) {
  return useQuery({ queryKey: ["attendance", month], queryFn: () => getAttendanceMonth(month) });
}
