"use client";

import { type ChangeEvent, type DragEvent, useState } from "react";
import Link from "next/link";
import type { ApiSchema } from "@/shared/api/contract";
import { routes } from "@/shared/routes";
import { uploadDocument as defaultUploadDocument } from "./upload-client";
import styles from "./upload.module.css";

const MAX_PDF_BYTES = 50 * 1024 * 1024;

export type UploadedDocument = ApiSchema<"Document">;

export type UploadDocument = (
  file: File,
  onProgress: (progress: number) => void,
) => Promise<UploadedDocument>;

type UploadStatus = "idle" | "uploading" | "success" | "error";
type UploadResults = Record<string, UploadedDocument>;
type UploadProgress = Record<string, number>;

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function validatePdf(file: File): string | null {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) return "Выберите файл в формате PDF";
  if (file.size === 0) return "PDF не должен быть пустым";
  if (file.size > MAX_PDF_BYTES) {
    return "Размер PDF не должен превышать 50 МБ";
  }
  return null;
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) return `${Math.ceil(sizeBytes / 1024)} КБ`;
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} МБ`;
}

function formatPageCount(count: number) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return `${count} страниц`;
  if (mod10 === 1) return `${count} страница`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} страницы`;
  return `${count} страниц`;
}

export function UploadForm({
  uploadDocument = defaultUploadDocument,
  onComplete,
}: {
  uploadDocument?: UploadDocument;
  onComplete?: (documents: UploadedDocument[]) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progressByFile, setProgressByFile] = useState<UploadProgress>({});
  const [resultsByFile, setResultsByFile] = useState<UploadResults>({});
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const totalPages = Object.values(resultsByFile).reduce(
    (sum, result) => sum + result.pageCount,
    0,
  );
  const totalProgress = files.length
    ? Math.round(
        files.reduce(
          (sum, file) => sum + (progressByFile[fileKey(file)] ?? 0),
          0,
        ) / files.length,
      )
    : 0;

  function addFiles(nextFiles: File[]) {
    if (status !== "idle") return;
    if (nextFiles.length !== 1) {
      setError("Для одного заказа можно загрузить только один PDF");
      return;
    }
    const validationError = validatePdf(nextFiles[0]);
    if (validationError) {
      setError(validationError);
      return;
    }
    setFiles([nextFiles[0]]);
    setProgressByFile({});
    setResultsByFile({});
    setError(null);
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function removeFile(key: string) {
    if (status === "uploading" || status === "success" || resultsByFile[key]) return;

    const nextFiles = files.filter((file) => fileKey(file) !== key);
    setFiles(nextFiles);
    setProgressByFile((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setError(null);

    if (!nextFiles.length || !Object.keys(resultsByFile).length) {
      setStatus("idle");
    } else if (nextFiles.every((file) => resultsByFile[fileKey(file)])) {
      setStatus("success");
    } else {
      setStatus("error");
    }
  }

  async function handleUpload() {
    if (!files.length || status === "uploading" || status === "success") return;

    setStatus("uploading");
    setError(null);
    const completed = { ...resultsByFile };
    let hasFailure = false;

    for (const file of files) {
      const key = fileKey(file);
      if (completed[key]) continue;

      try {
        const uploaded = await uploadDocument(file, (fileProgress) => {
          setProgressByFile((current) => ({
            ...current,
            [key]: fileProgress,
          }));
        });
        completed[key] = uploaded;
        setResultsByFile({ ...completed });
        setProgressByFile((current) => ({ ...current, [key]: 100 }));
      } catch {
        hasFailure = true;
        setProgressByFile((current) => ({ ...current, [key]: 0 }));
      }
    }

    if (hasFailure) {
      setError("Нет соединения. Проверьте интернет и повторите попытку");
      setStatus("error");
    } else {
      onComplete?.(files.map((file) => completed[fileKey(file)]));
      setStatus("success");
    }
  }

  return (
    <section className={styles.workspace} aria-labelledby="upload-title">
      <div className={styles.heading}>
        <h1 id="upload-title">Загрузите <span>файл</span></h1>
        <p>Один PDF до 50 МБ. После загрузки мы проверим количество страниц.</p>
      </div>

      <p className={styles.srOnly} aria-live="polite">
        {files.length ? "Файл выбран" : "Файл не выбран"}
      </p>

      <div
        data-testid="pdf-dropzone"
        className={`${styles.dropzone} ${files.length ? styles.queue : ""} ${isDragging ? styles.dropzoneActive : ""}`}
        onDragEnter={() => status === "idle" && setIsDragging(true)}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setIsDragging(false);
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        {!files.length ? (
          <>
            <span className={styles.documentIcon} aria-hidden="true">PDF</span>
            <div className={styles.emptyCopy}>
              <strong>Перетащите файл сюда</strong>
              <p>или выберите его на устройстве</p>
            </div>
            <label className={styles.fileButton}>
              Выбрать файл
              <input
                className={styles.fileInput}
                type="file"
                accept="application/pdf,.pdf"
                aria-label="Выбрать файл"
                onChange={handleFileInput}
              />
            </label>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
          </>
        ) : (
          <>
            <div className={styles.queueHeader}>
              <div>
                <strong>Файл выбран</strong>
                <span>{formatFileSize(totalSize)}</span>
              </div>
              {status === "idle" ? (
                <label className={styles.addButton}>
                  Заменить файл
                  <input
                    className={styles.fileInput}
                    type="file"
                    accept="application/pdf,.pdf"
                    aria-label="Заменить файл"
                    onChange={handleFileInput}
                  />
                </label>
              ) : null}
            </div>

            <ul className={styles.fileList} aria-label="Выбранный файл">
              {files.map((file) => {
                const key = fileKey(file);
                const isUploaded = Boolean(resultsByFile[key]);
                const canRemove =
                  !isUploaded && (status === "idle" || status === "error");

                return (
                  <li className={styles.fileRow} key={key}>
                    <span className={styles.fileMark} aria-hidden="true">PDF</span>
                    <div className={styles.fileDetails}>
                      <strong>{file.name}</strong>
                      <span>{formatFileSize(file.size)}</span>
                    </div>
                    {isUploaded ? (
                      <span className={styles.fileStatus}>Загружен</span>
                    ) : canRemove ? (
                      <button
                        className={styles.removeButton}
                        type="button"
                        aria-label={`Удалить ${file.name}`}
                        onClick={() => removeFile(key)}
                      >
                        Удалить
                      </button>
                    ) : (
                      <span className={styles.fileStatus}>Ожидает</span>
                    )}
                  </li>
                );
              })}
            </ul>

            {status === "uploading" ? (
              <div className={styles.progressBlock} aria-live="polite">
                <div><span>Загружаем файл</span><strong>{totalProgress}%</strong></div>
                <progress max="100" value={totalProgress} aria-label="Прогресс загрузки" />
              </div>
            ) : null}

            {error ? <p className={styles.error} role="alert">{error}</p> : null}

            {status === "success" ? (
              <div className={styles.success} role="status">
                <span aria-hidden="true">OK</span>
                <div>
                  <strong>Документ загружен</strong>
                  <p>{formatPageCount(totalPages)}</p>
                </div>
                <Link
                  className={styles.primaryButton}
                  href={`${routes.points}?documentId=${encodeURIComponent(resultsByFile[fileKey(files[0])].id)}`}
                >
                  Выбрать точку
                </Link>
              </div>
            ) : null}

            {status !== "success" ? (
              <div className={styles.queueFooter}>
                <p>Отправка начнётся только после подтверждения.</p>
                <button
                  className={styles.primaryButton}
                  type="button"
                  disabled={status === "uploading"}
                  onClick={handleUpload}
                >
                  {status === "idle" ? "Загрузить файл" : null}
                  {status === "uploading" ? "Загружаем файл" : null}
                  {status === "error" ? "Повторить загрузку" : null}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
