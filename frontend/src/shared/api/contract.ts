import type { components, operations, paths } from "./schema";

export const API_CONTRACT = {
  version: "0.1.0",
  backendCommit: "fa24d4b50b7ef21b0c4f5911b90728d8f2dbc7ed",
  sha256: "ca1e3640b3e82e4264322656d6ba4524db648a895ab0c7550c29769718f3552b",
} as const;

export type ApiComponents = components;
export type ApiOperations = operations;
export type ApiPaths = paths;
export type ApiSchema<Name extends keyof components["schemas"]> =
  components["schemas"][Name];
