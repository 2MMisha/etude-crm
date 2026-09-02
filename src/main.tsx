import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { routeTree } from "./routeTree.gen";
import "./index.css";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const queryClient = new QueryClient();

if (import.meta.env.DEV) {
  // Debug hook only — lets devtools/tests force a refetch (e.g. queryClient.invalidateQueries())
  // or override the online/offline state React Query paused fetches on (onlineManager.setOnline(true)).
  Object.assign(window as unknown as Record<string, unknown>, { __queryClient: queryClient, __onlineManager: onlineManager });
}

const rootElement = document.getElementById("root")!;
createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
