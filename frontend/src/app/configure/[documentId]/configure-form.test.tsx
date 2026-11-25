import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { printPointFixtures } from "@/shared/api/contract-fixtures";
import {
  readPrintSettings,
  savePendingDocuments,
  SELECTED_PRINT_POINT_KEY,
} from "@/shared/order-draft";
import {
  ConfigureForm,
  type CreateQuote,
  type LoadDocument,
} from "./configure-form";

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

function quote(copies = 1) {
  return {
    id: `quote-${copies}`,
    expiresAt: "2026-11-23T10:15:00.000Z",
    city: "Москва",
    documentId: "document-one",
    pageCount: 12,
    colorMode: "BW" as const,
    copies,
    offers: [{
      printPointId: printPointFixtures[0].id,
      name: printPointFixtures[0].name,
      city: printPointFixtures[0].city,
      address: printPointFixtures[0].address,
      workingHours: printPointFixtures[0].workingHours,
      pricePerPage: 500,
      total: 12 * copies * 500,
    }],
  };
}

describe("ConfigureForm", () => {
  beforeEach(() => {
    sessionStorage.clear();
    savePendingDocuments(documents);
    sessionStorage.setItem(SELECTED_PRINT_POINT_KEY, printPointFixtures[0].id);
  });

  it("shows document settings and the selected point quote", async () => {
    const createQuote = vi.fn<CreateQuote>().mockResolvedValue(quote());
    const loadDocument = vi.fn<LoadDocument>();

    render(
      <ConfigureForm
        documentId="document-one"
        createQuote={createQuote}
        loadDocument={loadDocument}
      />,
    );

    expect(screen.getByRole("heading", { name: "Настройте печать" })).toBeInTheDocument();
    expect(screen.getByText("lecture.pdf")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Чёрно-белая" })).toBeChecked();
    expect(await screen.findByText(/60,00\s*₽/)).toBeInTheDocument();
    expect(loadDocument).not.toHaveBeenCalled();
  });

  it("recalculates the quote after copies change", async () => {
    const user = userEvent.setup();
    const createQuote = vi.fn<CreateQuote>(async ({ copies }) => quote(copies));

    render(<ConfigureForm documentId="document-one" createQuote={createQuote} />);
    await screen.findByText(/60,00\s*₽/);

    const copies = screen.getByRole("spinbutton", { name: "Количество копий" });
    await user.clear(copies);
    await user.type(copies, "2");

    expect(await screen.findByText(/120,00\s*₽/)).toBeInTheDocument();
    await waitFor(() => expect(createQuote).toHaveBeenLastCalledWith({
      documentId: "document-one",
      colorMode: "BW",
      copies: 2,
    }));
  });

  it("shows approved empty state when the selected point has no offer", async () => {
    const createQuote = vi.fn<CreateQuote>().mockResolvedValue({
      ...quote(),
      offers: [],
    });

    render(<ConfigureForm documentId="document-one" createQuote={createQuote} />);

    expect(await screen.findByText("Нет предложений")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Изменить параметры" }))
      .toHaveAttribute("href", "/points?documentId=document-one");
  });

  it("retries a failed quote without losing settings", async () => {
    const user = userEvent.setup();
    const createQuote = vi.fn<CreateQuote>()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(quote(2));

    render(<ConfigureForm documentId="document-one" createQuote={createQuote} />);

    const copies = screen.getByRole("spinbutton", { name: "Количество копий" });
    await user.clear(copies);
    await user.type(copies, "2");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Нет соединения. Проверьте интернет и повторите попытку.",
    );

    await user.click(screen.getByRole("button", { name: "Повторить расчёт" }));

    expect(await screen.findByText(/120,00\s*₽/)).toBeInTheDocument();
    expect(copies).toHaveValue(2);
  });

  it("saves the single document settings and opens checkout", async () => {
    const user = userEvent.setup();
    const createQuote = vi.fn<CreateQuote>().mockResolvedValue(quote());

    render(<ConfigureForm documentId="document-one" createQuote={createQuote} />);
    await screen.findByText(/60,00\s*₽/);

    const checkout = screen.getByRole("link", { name: "Перейти к подтверждению" });
    expect(checkout).toHaveAttribute("href", "/checkout/document-one");
    expect(screen.queryByRole("link", { name: "Настроить следующий файл" }))
      .not.toBeInTheDocument();
    await user.click(checkout);

    expect(readPrintSettings("document-one")).toEqual(expect.objectContaining({
      documentId: "document-one",
      quoteId: "quote-1",
      printPointName: printPointFixtures[0].name,
      printPointAddress: printPointFixtures[0].address,
      total: 6000,
    }));
  });
});
