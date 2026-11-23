import type { UploadDocument, UploadedDocument } from "./upload-form";

export const uploadDocument: UploadDocument = (file, onProgress) =>
  new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const body = new FormData();
    body.append("file", file);

    request.open("POST", "/api/documents");
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    request.addEventListener("load", () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error("UPLOAD_FAILED"));
        return;
      }
      try {
        onProgress(100);
        resolve(JSON.parse(request.responseText) as UploadedDocument);
      } catch {
        reject(new Error("INVALID_RESPONSE"));
      }
    });
    request.addEventListener("error", () => reject(new Error("NETWORK_ERROR")));
    request.send(body);
  });
