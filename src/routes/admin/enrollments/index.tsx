import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/admin/enrollments/")({
  component: () => <StubPage title="Записи" phase="Фазе 1" />,
});
