import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/admin/students/")({
  component: () => <StubPage title="Ученики" phase="Фазе 1" />,
});
