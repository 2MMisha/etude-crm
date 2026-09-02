import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/admin/settings/")({
  component: () => <StubPage title="Настройки" phase="Фазе 1" />,
});
