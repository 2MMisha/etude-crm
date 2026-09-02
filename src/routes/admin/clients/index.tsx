import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/admin/clients/")({
  component: () => <StubPage title="Клиенты" phase="Фазе 1" />,
});
