import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/admin/lessons/")({
  component: () => <StubPage title="Индивидуальные" phase="Фазе 3" />,
});
