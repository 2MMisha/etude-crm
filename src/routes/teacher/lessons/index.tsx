import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/teacher/lessons/")({
  component: () => <StubPage title="Мои занятия за месяц" phase="Фазе 3" />,
});
