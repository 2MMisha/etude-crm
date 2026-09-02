import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/admin/attendance/")({
  component: () => <StubPage title="Посещаемость" phase="Фазе 2" />,
});
