import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/admin/clients/$clientId")({
  component: () => <StubPage title="Дело клиента" phase="Фазе 1" />,
});
