import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/admin/")({
  component: () => <StubPage title="Дашборд" phase="Фазе 4" />,
});
