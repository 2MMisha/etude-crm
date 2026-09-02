import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadSession } from "@/lib/auth/tokenStorage";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const session = loadSession();
    if (!session) throw redirect({ to: "/login" });
    throw redirect({ to: session.role === "admin" ? "/admin" : "/teacher" });
  },
});
