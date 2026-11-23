import type { components, operations, paths } from "./schema";

export const API_CONTRACT = {
  version: "0.1.0",
  backendCommit: "bfb5757e1796b900cc293f22cdc9cc431b1dc306",
  sha256: "684610bf2fb86a7ed3e4fbb28ee5c880a4e1be3c5a924a61b0e45eda5f10902b",
} as const;

export type ApiComponents = components;
export type ApiOperations = operations;
export type ApiPaths = paths;
export type ApiSchema<Name extends keyof components["schemas"]> =
  components["schemas"][Name];
