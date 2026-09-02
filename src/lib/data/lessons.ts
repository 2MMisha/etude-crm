import { useQuery } from "@tanstack/react-query";
import { lessonsMonthSchema, type LessonsMonth, type Lesson } from "@/schemas/lessonsMonth";
import { appendToMonthFile, listCollection } from "./repo";

export function listLessonsMonths(): Promise<LessonsMonth[]> {
  return listCollection("lessons", lessonsMonthSchema);
}

export function useLessonsMonths() {
  return useQuery({ queryKey: ["lessons"], queryFn: listLessonsMonths });
}

export async function addLesson(lesson: Lesson): Promise<void> {
  const month = lesson.date.slice(0, 7);
  await appendToMonthFile(
    `lessons/${month}.json`,
    lessonsMonthSchema,
    () => ({ month, lessons: [] }),
    (base, item: Lesson) => ({ ...base, lessons: [...base.lessons, item] }),
    lesson,
    `Индивидуальный урок ${lesson.date}`,
  );
}
