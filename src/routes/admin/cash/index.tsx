import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/StubPage";

export const Route = createFileRoute("/admin/cash/")({
  component: () => <StubPage title="Касса" phase="Фазе 3" />,
});
