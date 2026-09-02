import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/admin/users/")({
  component: () => <StubPage title="Пользователи" phase="Фазе 1" />,
});
