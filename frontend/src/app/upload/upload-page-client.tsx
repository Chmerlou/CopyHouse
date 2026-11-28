"use client";

import { saveUploadedDocument } from "@/shared/order-draft";
import { UploadForm } from "./upload-form";

export function UploadPageClient() {
  return <UploadForm onComplete={([document]) => { if (document) saveUploadedDocument(document); }} />;
}
