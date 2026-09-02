import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadAuth } from "@/lib/auth/tokenStorage";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const auth = loadAuth();
    if (!auth) throw redirect({ to: "/login" });
    throw redirect({ to: auth.role === "admin" ? "/admin" : "/teacher" });
  },
});
