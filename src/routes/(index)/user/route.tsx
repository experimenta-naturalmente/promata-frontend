import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { type CurrentUser, userQueryOptions } from "@/api/user";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/(index)/user")({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    const qc = (context as { queryClient: QueryClient }).queryClient;
    let user = qc.getQueryData<CurrentUser | null>(userQueryOptions.queryKey);

    if (!user) {
      try {
        user = await qc.fetchQuery(userQueryOptions);
      } catch {
        // Não foi possível verificar a sessão. Voltar para a home preserva o
        // estado de login em vez de forçar um login desnecessário.
        toast.error("Não foi possível fazer login. Por favor, tente novamente.");
        throw redirect({ to: "/" });
      }
    }
    if (!user) {
      throw redirect({
        to: "/auth/login",
        search: { redirect: location.pathname },
      });
    }
  },
});

function RouteComponent() {
  return <Outlet />;
}
