import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UploadForm, type UploadDocument } from "./upload-form";

const lecturePdf = new File(["pdf"], "lecture.pdf", {
  type: "application/pdf",
});
const slidesPdf = new File(["pdf"], "slides.pdf", {
  type: "application/pdf",
});

function uploadedDocument(file: File) {
  return {
    id: `document-${file.name}`,
    originalName: file.name,
    sizeBytes: file.size,
    pageCount: 12,
    createdAt: "2026-11-23T10:00:00.000Z",
  };
}

describe("UploadForm", () => {
  it("rejects a file that is not PDF before upload", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const uploadDocument = vi.fn<UploadDocument>();

    render(<UploadForm uploadDocument={uploadDocument} />);
    await user.upload(
      screen.getByLabelText("Выбрать файлы"),
      new File(["text"], "notes.txt", { type: "text/plain" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Выберите файлы в формате PDF",
    );
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it("rejects a PDF larger than 50 MB before upload", async () => {
    const user = userEvent.setup();
    const uploadDocument = vi.fn<UploadDocument>();
    const oversizedPdf = new File(["pdf"], "archive.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(oversizedPdf, "size", { value: 50 * 1024 * 1024 + 1 });

    render(<UploadForm uploadDocument={uploadDocument} />);
    await user.upload(screen.getByLabelText("Выбрать файлы"), oversizedPdf);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Размер каждого PDF не должен превышать 50 МБ",
    );
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it("replaces the empty dropzone with a multi-file queue", async () => {
    const user = userEvent.setup();

    render(<UploadForm />);
    await user.upload(
      screen.getByLabelText("Выбрать файлы"),
      [lecturePdf, slidesPdf],
    );

    expect(screen.queryByText("Перетащите файлы сюда")).not.toBeInTheDocument();
    expect(screen.getByText("lecture.pdf")).toBeInTheDocument();
    expect(screen.getByText("slides.pdf")).toBeInTheDocument();
    expect(screen.getByLabelText("Добавить файлы")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Загрузить файлы" })).toBeEnabled();
  });

  it("removes a selected file without clearing the rest of the queue", async () => {
    const user = userEvent.setup();

    render(<UploadForm />);
    await user.upload(
      screen.getByLabelText("Выбрать файлы"),
      [lecturePdf, slidesPdf],
    );
    await user.click(screen.getByRole("button", { name: "Удалить slides.pdf" }));

    expect(screen.getByText("lecture.pdf")).toBeInTheDocument();
    expect(screen.queryByText("slides.pdf")).not.toBeInTheDocument();
  });

  it("uploads every selected file only after confirmation", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const uploadDocument = vi.fn<UploadDocument>(async (file, onProgress) => {
      onProgress(100);
      return uploadedDocument(file);
    });

    render(<UploadForm uploadDocument={uploadDocument} onComplete={onComplete} />);
    await user.upload(
      screen.getByLabelText("Выбрать файлы"),
      [lecturePdf, slidesPdf],
    );

    expect(uploadDocument).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Загрузить файлы" }));

    expect(await screen.findByText("2 файла загружены")).toBeInTheDocument();
    expect(screen.getByText("24 страницы")).toBeInTheDocument();
    expect(uploadDocument).toHaveBeenCalledTimes(2);
    expect(onComplete).toHaveBeenCalledWith([
      expect.objectContaining({ id: "document-lecture.pdf" }),
      expect.objectContaining({ id: "document-slides.pdf" }),
    ]);
    expect(screen.getByRole("link", { name: "Настроить первый файл" }))
      .toHaveAttribute("href", "/points?documentId=document-lecture.pdf");
  });

  it("retries only files that did not upload", async () => {
    const user = userEvent.setup();
    const uploadDocument = vi
      .fn<UploadDocument>()
      .mockImplementationOnce(async (file) => uploadedDocument(file))
      .mockRejectedValueOnce(new Error("network"))
      .mockImplementationOnce(async (file) => uploadedDocument(file));

    render(<UploadForm uploadDocument={uploadDocument} />);
    await user.upload(
      screen.getByLabelText("Выбрать файлы"),
      [lecturePdf, slidesPdf],
    );
    await user.click(screen.getByRole("button", { name: "Загрузить файлы" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось загрузить все файлы",
    );
    await user.click(screen.getByRole("button", { name: "Повторить загрузку" }));

    expect(await screen.findByText("2 файла загружены")).toBeInTheDocument();
    expect(uploadDocument).toHaveBeenCalledTimes(3);
  });

  it("finishes successfully when the failed file is removed", async () => {
    const user = userEvent.setup();
    const uploadDocument = vi
      .fn<UploadDocument>()
      .mockImplementationOnce(async (file) => uploadedDocument(file))
      .mockRejectedValueOnce(new Error("network"));

    render(<UploadForm uploadDocument={uploadDocument} />);
    await user.upload(
      screen.getByLabelText("Выбрать файлы"),
      [lecturePdf, slidesPdf],
    );
    await user.click(screen.getByRole("button", { name: "Загрузить файлы" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Удалить slides.pdf" }));

    expect(screen.getByText("1 файл загружен")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Удалить lecture.pdf" }),
    ).not.toBeInTheDocument();
  });
});
