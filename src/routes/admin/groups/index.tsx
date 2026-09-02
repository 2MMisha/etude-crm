import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/admin/groups/")({
  component: () => <StubPage title="Группы" phase="Фазе 1" />,
});
