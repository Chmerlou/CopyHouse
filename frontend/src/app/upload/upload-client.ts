import type { UploadDocument, UploadedDocument } from "./upload-form";

export const uploadErrorMessages: Readonly<Record<string, string>> = Object.freeze({
  INVALID_PDF: "Не удалось прочитать PDF. Откройте файл и проверьте его или выберите другой.",
  EMPTY_PDF: "В PDF нет страниц. Выберите другой файл.",
  FILE_TOO_LARGE: "Размер PDF не должен превышать 50 МБ.",
  UNSUPPORTED_FILE_TYPE: "Выберите файл в формате PDF.",
  UNAUTHORIZED: "Войдите в аккаунт снова, чтобы загрузить файл.",
});

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
        try {
          const body: { code?: string } | null = JSON.parse(request.responseText);
          reject(new Error(body?.code ?? "UPLOAD_FAILED"));
        } catch {
          reject(new Error("UPLOAD_FAILED"));
        }
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
