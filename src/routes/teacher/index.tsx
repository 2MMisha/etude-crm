import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/teacher/")({
  component: () => <StubPage title="Мои группы на сегодня" phase="Фазе 2" />,
});
