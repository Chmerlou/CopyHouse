"use client";

import type { UploadedDocument } from "./upload-form";
import { UploadForm } from "./upload-form";

export const PENDING_DOCUMENTS_KEY = "copyhouse.pendingDocumentIds";

export function UploadPageClient() {
  function savePendingDocuments(documents: UploadedDocument[]) {
    sessionStorage.setItem(
      PENDING_DOCUMENTS_KEY,
      JSON.stringify(documents.map((document) => document.id)),
    );
  }

  return <UploadForm onComplete={savePendingDocuments} />;
}
