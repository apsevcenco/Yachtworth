export * from "./generated/api";
export * from "./generated/api.schemas";
export {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
export {
  setBaseUrl,
  setAuthTokenGetter,
  getBaseUrl,
  getAuthToken,
} from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";
export * from './generated/api';
export * from './generated/api.schemas';
