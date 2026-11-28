import type { ApiSchema } from "./api/contract";

export const PENDING_DOCUMENTS_KEY = "copyhouse.pendingDocumentIds";
export const SELECTED_PRINT_POINT_KEY = "copyhouse.selectedPrintPointId";
const PRINT_SETTINGS_KEY = "copyhouse.printSettings";
const legacyPdfDecoder = new TextDecoder("utf-8", { fatal: true });

export type PendingDocument = ApiSchema<"Document"> & { catalogPrintPointId?: string };
export type PrintOptions = ApiSchema<"QuoteRequest">;

export type StoredPrintSettings = PrintOptions & {
  quoteId: string;
  printPointId: string;
  printPointName: string;
  printPointAddress: string;
  pricePerPage: number;
  total: number;
  expiresAt: string;
};

function readStorage(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? "null") as unknown;
  } catch {
    return null;
  }
}

export function savePendingDocuments(documents: PendingDocument[]) {
  sessionStorage.setItem(PENDING_DOCUMENTS_KEY, JSON.stringify(documents.slice(0, 1)));
}

export function saveUploadedDocument(document: ApiSchema<"Document">) {
  const catalogPrintPointId = readSelectedPrintPointId();
  savePendingDocuments([{ ...document, catalogPrintPointId: catalogPrintPointId ?? undefined }]);
  sessionStorage.removeItem(SELECTED_PRINT_POINT_KEY);
}

export function readPendingDocuments(): PendingDocument[] {
  const value = readStorage(PENDING_DOCUMENTS_KEY);
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PendingDocument => (
    typeof item === "object"
    && item !== null
    && typeof (item as PendingDocument).id === "string"
    && typeof (item as PendingDocument).originalName === "string"
    && Number.isInteger((item as PendingDocument).pageCount)
  )).map((item) => ({ ...item, originalName: restoredPdfName(item.originalName) }));
}

const pointSelectionKey = (documentId?: string) => documentId
  ? `${SELECTED_PRINT_POINT_KEY}:${documentId}` : SELECTED_PRINT_POINT_KEY;

export function saveSelectedPrintPointId(pointId: string, documentId?: string) {
  sessionStorage.setItem(pointSelectionKey(documentId), pointId);
}

export function readSelectedPrintPointId(documentId?: string) {
  const selected = sessionStorage.getItem(pointSelectionKey(documentId));
  if (selected || !documentId) return selected;
  return readPendingDocuments().find((item) => item.id === documentId)?.catalogPrintPointId ?? null;
}

function restoredPdfName(name: string) {
  if (!/[\u0080-\u00ff]/u.test(name) || /[\u0100-\u{10ffff}]/u.test(name)) return name;
  try {
    const restored = legacyPdfDecoder.decode(Uint8Array.from(name, (character) => character.charCodeAt(0)));
    return /\p{Script=Cyrillic}/u.test(restored) ? restored : name;
  } catch {
    return name;
  }
}

function readAllPrintSettings(): Record<string, StoredPrintSettings | PrintOptions> {
  const value = readStorage(PRINT_SETTINGS_KEY);
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, StoredPrintSettings | PrintOptions>
    : {};
}

function saveDraft(settings: StoredPrintSettings | PrintOptions) {
  sessionStorage.setItem(PRINT_SETTINGS_KEY, JSON.stringify({
    ...readAllPrintSettings(),
    [settings.documentId]: settings,
  }));
}

export function savePrintOptions({ documentId, colorMode, copies }: PrintOptions) {
  saveDraft({ documentId, colorMode, copies });
}

export function savePrintSettings(settings: StoredPrintSettings) {
  saveDraft(settings);
}

export function readPrintOptions(documentId: string): PrintOptions | null {
  const settings = readAllPrintSettings()[documentId];
  if (!settings || settings.documentId !== documentId
    || (settings.colorMode !== "BW" && settings.colorMode !== "COLOR")
    || !Number.isInteger(settings.copies) || settings.copies < 1 || settings.copies > 100) return null;
  return { documentId, colorMode: settings.colorMode, copies: settings.copies };
}

export function readPrintSettings(documentId: string) {
  const settings = readAllPrintSettings()[documentId];
  return settings && "quoteId" in settings && settings.quoteId ? settings : null;
}

type CheckoutAttempt = { key: string; orderId?: string };
const checkoutStorageKey = (quoteId: string, pointId: string) => `copyhouse.checkout:${quoteId}:${pointId}`;

export function readCheckoutAttempt(quoteId: string, pointId: string): CheckoutAttempt | null {
  const value = readStorage(checkoutStorageKey(quoteId, pointId)) as Partial<CheckoutAttempt> | null;
  if (typeof value?.key !== "string") return null;
  return { key: value.key, orderId: typeof value.orderId === "string" ? value.orderId : undefined };
}

export function saveCheckoutAttempt(quoteId: string, pointId: string, { key, orderId }: CheckoutAttempt) {
  try {
    sessionStorage.setItem(checkoutStorageKey(quoteId, pointId), JSON.stringify({ key, orderId }));
  } catch {
    // The in-memory attempt still handles retries until the page reloads.
  }
}
