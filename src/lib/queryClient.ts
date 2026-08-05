import { QueryClient } from "@tanstack/react-query";

/** App-wide QueryClient — REST/callable pilots only (not Firestore listeners). */
export const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
