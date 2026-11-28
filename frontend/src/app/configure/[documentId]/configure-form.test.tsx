import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadedDocumentFixture } from "@/shared/api/contract-fixtures";
import { readPrintOptions, readPrintSettings, savePendingDocuments, savePrintOptions } from "@/shared/order-draft";
import { ConfigureForm, type LoadDocument } from "./configure-form";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const documentId = uploadedDocumentFixture.id;
const offer = { printPointId: "point-one", name: "Копицентр", address: "Ленина, 12", pricePerPage: 400, total: 4800 };
const quote = { id: "quote-one", documentId, colorMode: "BW", copies: 1, expiresAt: "2099-11-23T10:15:00.000Z", offers: [offer] };

describe("ConfigureForm", () => {
  beforeEach(() => {
    sessionStorage.clear();
    push.mockClear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("saves valid print options and opens comparison without a chosen point", async () => {
    savePendingDocuments([uploadedDocumentFixture]);
    const user = userEvent.setup();
    render(<ConfigureForm documentId={documentId} />);

    await user.click(screen.getByRole("radio", { name: "Цветная" }));
    const copies = screen.getByRole("spinbutton", { name: "Количество копий" });
    await user.clear(copies);
    expect(screen.getByRole("button", { name: "Сравнить цены" })).toBeDisabled();
    await user.type(copies, "2");
    await user.click(screen.getByRole("button", { name: "Сравнить цены" }));

    expect(readPrintOptions(documentId)).toEqual({ documentId, colorMode: "COLOR", copies: 2 });
    expect(push).toHaveBeenCalledWith(`/points?documentId=${documentId}`);
  });

  it("restores saved options and loads document details when needed", async () => {
    savePrintOptions({ documentId, colorMode: "COLOR", copies: 3 });
    const loadDocument = vi.fn<LoadDocument>().mockResolvedValue(uploadedDocumentFixture);
    render(<ConfigureForm documentId={documentId} loadDocument={loadDocument} />);

    expect(await screen.findByText(uploadedDocumentFixture.originalName)).toBeVisible();
    expect(screen.getByRole("radio", { name: "Цветная" })).toBeChecked();
    expect(screen.getByRole("spinbutton", { name: "Количество копий" })).toHaveValue(3);
    expect(screen.getByRole("button", { name: "Сравнить цены" })).toBeEnabled();
  });

  it("opens checkout directly with a server quote for the point chosen before upload", async () => {
    savePendingDocuments([{ ...uploadedDocumentFixture, catalogPrintPointId: offer.printPointId }]);
    const fetchQuote = vi.fn().mockResolvedValue(Response.json(quote));
    vi.stubGlobal("fetch", fetchQuote);
    const user = userEvent.setup();
    render(<ConfigureForm documentId={documentId} />);

    await user.click(screen.getByRole("button", { name: "Перейти к подтверждению" }));

    expect(fetchQuote).toHaveBeenCalledExactlyOnceWith("/api/quotes", expect.objectContaining({
      body: JSON.stringify({ documentId, colorMode: "BW", copies: 1 }),
    }));
    expect(readPrintSettings(documentId)).toMatchObject({ quoteId: quote.id, printPointId: offer.printPointId, total: offer.total });
    expect(push).toHaveBeenCalledExactlyOnceWith(`/checkout/${documentId}`);
  });

  it("offers a fresh selection if the point chosen before upload is unavailable", async () => {
    savePendingDocuments([{ ...uploadedDocumentFixture, catalogPrintPointId: "unavailable-point" }]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(quote)));
    const user = userEvent.setup();
    render(<ConfigureForm documentId={documentId} />);

    await user.click(screen.getByRole("button", { name: "Перейти к подтверждению" }));

    expect(push).toHaveBeenCalledExactlyOnceWith(`/points?documentId=${documentId}`);
    expect(readPrintSettings(documentId)).toBeNull();
  });

  it("keeps the catalog selection and options available for retry after a quote request fails", async () => {
    savePendingDocuments([{ ...uploadedDocumentFixture, catalogPrintPointId: offer.printPointId }]);
    const fetchQuote = vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json(quote));
    vi.stubGlobal("fetch", fetchQuote);
    const user = userEvent.setup();
    render(<ConfigureForm documentId={documentId} />);

    const confirm = screen.getByRole("button", { name: "Перейти к подтверждению" });
    await user.click(confirm);
    expect(await screen.findByRole("alert")).toHaveTextContent("Попробуйте рассчитать стоимость ещё раз.");
    expect(push).not.toHaveBeenCalled();
    expect(confirm).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledExactlyOnceWith(`/checkout/${documentId}`);
  });
});
