import type { ApiSchema } from "@/shared/api/contract";

type IdempotentResult = { bodyKey: string; orderId: string };
type StoredOrder = { ownerId: string; order: ApiSchema<"OrderClient"> };
type StoredQuote = { ownerId: string; quote: ApiSchema<"Quote"> };
type MockOrderStore = {
  documents: Map<string, ApiSchema<"Document">>;
  quotes: Map<string, StoredQuote>;
  orders: Map<string, StoredOrder>;
  idempotency: Map<string, IdempotentResult>;
};

const globalStore = globalThis as typeof globalThis & {
  __copyhouseMockOrderStore?: MockOrderStore;
};

// shortcut: Mock state is process-local; replace it when the mock flow needs
// persistence across multiple server instances.
export const mockOrderStore = globalStore.__copyhouseMockOrderStore ??= {
  documents: new Map(),
  quotes: new Map(),
  orders: new Map(),
  idempotency: new Map(),
};

export function resetMockOrderStore() {
  mockOrderStore.documents.clear();
  mockOrderStore.quotes.clear();
  mockOrderStore.orders.clear();
  mockOrderStore.idempotency.clear();
}
