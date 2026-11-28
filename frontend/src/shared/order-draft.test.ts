import { beforeEach, describe, expect, it } from "vitest";
import {
  readPendingDocuments,
  readPrintSettings,
  readSelectedPrintPointId,
  savePendingDocuments,
  savePrintSettings,
  saveSelectedPrintPointId,
  saveUploadedDocument,
} from "./order-draft";

const documents = [
  {
    id: "document-one",
    originalName: "lecture.pdf",
    sizeBytes: 1024,
    pageCount: 12,
    createdAt: "2026-11-23T10:00:00.000Z",
  },
  {
    id: "document-two",
    originalName: "slides.pdf",
    sizeBytes: 2048,
    pageCount: 8,
    createdAt: "2026-11-23T10:01:00.000Z",
  },
];

describe("order draft storage", () => {
  beforeEach(() => sessionStorage.clear());

  it("keeps only the single document allowed in an MVP order", () => {
    savePendingDocuments(documents);

    expect(readPendingDocuments()).toEqual([documents[0]]);
  });

  it("restores a Cyrillic filename cached by an older upload", () => {
    const originalName = "Документы для печати.pdf";
    const damagedName = Array.from(new TextEncoder().encode(originalName), (byte) => String.fromCharCode(byte)).join("");
    savePendingDocuments([{ ...documents[0], originalName: damagedName }]);

    expect(readPendingDocuments()[0].originalName).toBe(originalName);
  });

  it("uses a catalog selection for one upload and keeps later order choices scoped to their document", () => {
    saveSelectedPrintPointId("catalog-point");
    saveUploadedDocument(documents[0]);
    expect(readSelectedPrintPointId(documents[0].id)).toBe("catalog-point");

    saveSelectedPrintPointId("other-point", documents[0].id);
    expect(readSelectedPrintPointId(documents[0].id)).toBe("other-point");
    saveUploadedDocument(documents[1]);
    expect(readSelectedPrintPointId(documents[1].id)).toBeNull();
    expect(readPendingDocuments()).toEqual([documents[1]]);
  });

  it("saves settings independently for each document", () => {
    savePrintSettings({
      documentId: "document-one",
      colorMode: "BW",
      copies: 2,
      quoteId: "quote-one",
      printPointId: "point-one",
      printPointName: "CopyHouse Дорожная",
      printPointAddress: "ул. Дорожная, д.8",
      pricePerPage: 500,
      total: 12000,
      expiresAt: "2026-11-23T10:15:00.000Z",
    });
    savePrintSettings({
      documentId: "document-two",
      colorMode: "COLOR",
      copies: 1,
      quoteId: "quote-two",
      printPointId: "point-one",
      printPointName: "CopyHouse Дорожная",
      printPointAddress: "ул. Дорожная, д.8",
      pricePerPage: 2000,
      total: 16000,
      expiresAt: "2026-11-23T10:16:00.000Z",
    });

    expect(readPrintSettings("document-one")).toEqual(expect.objectContaining({
      colorMode: "BW",
      copies: 2,
      total: 12000,
    }));
    expect(readPrintSettings("document-two")).toEqual(expect.objectContaining({
      colorMode: "COLOR",
      copies: 1,
      total: 16000,
    }));
  });
});
