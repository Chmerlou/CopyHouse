"use client";

import type { UploadedDocument } from "./upload-form";
import { UploadForm } from "./upload-form";
import { savePendingDocuments as storePendingDocuments } from "@/shared/order-draft";

export function UploadPageClient() {
  function savePendingDocuments(documents: UploadedDocument[]) {
    storePendingDocuments(documents);
  }

  return <UploadForm onComplete={savePendingDocuments} />;
}
