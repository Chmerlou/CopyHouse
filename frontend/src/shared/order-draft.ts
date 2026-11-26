import type { ApiSchema } from "./api/contract";

export const PENDING_DOCUMENTS_KEY = "copyhouse.pendingDocumentIds";
export const SELECTED_PRINT_POINT_KEY = "copyhouse.selectedPrintPointId";
const PRINT_SETTINGS_KEY = "copyhouse.printSettings";

export type PendingDocument = ApiSchema<"Document">;
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

export function readPendingDocuments(): PendingDocument[] {
  const value = readStorage(PENDING_DOCUMENTS_KEY);
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PendingDocument => (
    typeof item === "object"
    && item !== null
    && typeof (item as PendingDocument).id === "string"
    && typeof (item as PendingDocument).originalName === "string"
    && Number.isInteger((item as PendingDocument).pageCount)
  ));
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
