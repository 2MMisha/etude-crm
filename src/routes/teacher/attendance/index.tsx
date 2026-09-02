import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/teacher/attendance/")({
  component: () => <StubPage title="Отметка посещаемости" phase="Фазе 2" />,
});
