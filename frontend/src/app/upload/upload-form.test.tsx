import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UploadForm, type UploadDocument } from "./upload-form";

const lecturePdf = new File(["pdf"], "lecture.pdf", {
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
      screen.getByLabelText("Выбрать файл"),
      new File(["text"], "notes.txt", { type: "text/plain" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Выберите файл в формате PDF",
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
    await user.upload(screen.getByLabelText("Выбрать файл"), oversizedPdf);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Размер PDF не должен превышать 50 МБ",
    );
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it("accepts only one PDF per order", async () => {
    const user = userEvent.setup();

    render(<UploadForm />);
    const input = screen.getByLabelText("Выбрать файл");
    expect(input).not.toHaveAttribute("multiple");
    fireEvent.drop(screen.getByTestId("pdf-dropzone"), {
      dataTransfer: { files: [lecturePdf, new File(["pdf"], "slides.pdf", { type: "application/pdf" })] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Для одного заказа можно загрузить только один PDF",
    );
    await user.upload(input, lecturePdf);
    expect(screen.getByText("lecture.pdf")).toBeInTheDocument();
    expect(screen.getByLabelText("Заменить файл")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Загрузить файл" })).toBeEnabled();
  });

  it("replaces the selected file before upload", async () => {
    const user = userEvent.setup();
    const replacement = new File(["pdf"], "slides.pdf", { type: "application/pdf" });

    render(<UploadForm />);
    await user.upload(screen.getByLabelText("Выбрать файл"), lecturePdf);
    await user.upload(screen.getByLabelText("Заменить файл"), replacement);

    expect(screen.queryByText("lecture.pdf")).not.toBeInTheDocument();
    expect(screen.getByText("slides.pdf")).toBeInTheDocument();
  });

  it("uploads the selected file only after confirmation", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const uploadDocument = vi.fn<UploadDocument>(async (file, onProgress) => {
      onProgress(100);
      return uploadedDocument(file);
    });

    render(<UploadForm uploadDocument={uploadDocument} onComplete={onComplete} />);
    await user.upload(
      screen.getByLabelText("Выбрать файл"),
      lecturePdf,
    );

    expect(uploadDocument).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Загрузить файл" }));

    expect(await screen.findByText("Файл загружен")).toBeInTheDocument();
    expect(screen.getByText("12 страниц")).toBeInTheDocument();
    expect(uploadDocument).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith([
      expect.objectContaining({ id: "document-lecture.pdf" }),
    ]);
    expect(screen.getByRole("link", { name: "Настроить печать" }))
      .toHaveAttribute("href", "/configure/document-lecture.pdf");
  });

  it("explains when the server rejects a damaged PDF", async () => {
    const user = userEvent.setup();
    const uploadDocument = vi.fn<UploadDocument>().mockRejectedValue(new Error("INVALID_PDF"));

    render(<UploadForm uploadDocument={uploadDocument} />);
    await user.upload(screen.getByLabelText("Выбрать файл"), lecturePdf);
    await user.click(screen.getByRole("button", { name: "Загрузить файл" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось прочитать PDF");
  });

  it("retries a failed upload", async () => {
    const user = userEvent.setup();
    const uploadDocument = vi
      .fn<UploadDocument>()
      .mockRejectedValueOnce(new Error("network"))
      .mockImplementationOnce(async (file) => uploadedDocument(file));

    render(<UploadForm uploadDocument={uploadDocument} />);
    await user.upload(
      screen.getByLabelText("Выбрать файл"),
      lecturePdf,
    );
    await user.click(screen.getByRole("button", { name: "Загрузить файл" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось загрузить файл. Попробуйте ещё раз.",
    );
    await user.click(screen.getByRole("button", { name: "Повторить загрузку" }));

    expect(await screen.findByText("Файл загружен")).toBeInTheDocument();
    expect(uploadDocument).toHaveBeenCalledTimes(2);
  });
});
