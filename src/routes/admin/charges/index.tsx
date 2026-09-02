import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/admin/charges/")({
  component: () => <StubPage title="Начисления" phase="Фазе 3" />,
});
