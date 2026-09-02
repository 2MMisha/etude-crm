import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/admin/leads/")({
  component: () => <StubPage title="Лиды" phase="Фазе 4" />,
});
