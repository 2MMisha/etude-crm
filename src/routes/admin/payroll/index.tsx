import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/admin/payroll/")({
  component: () => <StubPage title="Зарплата" phase="Фазе 4" />,
});
