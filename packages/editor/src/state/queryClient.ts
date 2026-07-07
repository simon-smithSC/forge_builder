// Shared TanStack Query client per ADR 0002. Query wraps server READS only;
// the bespoke autosave + write-ahead journal write path (persistence.ts)
// stays as is.
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});
