import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Ship server-fetched React Query cache to the client so useSuspenseQuery
    // reuses SSR data instead of refetching (which fails when the PHP API is
    // on a different origin than the front-end, e.g. Lovable preview → .com.br).
    dehydrate: (): any => ({ queryClientState: dehydrate(queryClient) }),
    hydrate: (dehydrated: any) => {
      hydrate(queryClient, dehydrated.queryClientState);
    },
  });

  return router;
};
