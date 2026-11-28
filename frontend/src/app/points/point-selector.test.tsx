import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { printPointFixtures, uploadedDocumentFixture } from "@/shared/api/contract-fixtures";
import type { ApiSchema } from "@/shared/api/contract";
import {
  listPrintPoints,
  PointSelector,
  type ListPrintPoints,
} from "./point-selector";
import { readPrintSettings, savePrintOptions, saveUploadedDocument, SELECTED_PRINT_POINT_KEY } from "@/shared/order-draft";

const response = printPointFixtures.slice(0, 2);
const printOptions = { documentId: "document-id", colorMode: "BW", copies: 2 } as const;
const quote = {
  ...printOptions,
  id: "quote-id",
  city: "Москва",
  expiresAt: "2099-11-23T10:15:00.000Z",
  pageCount: 12,
  offers: response.map((point) => ({
    printPointId: point.id,
    name: point.name,
    address: point.address,
    city: point.city,
    workingHours: point.workingHours,
    pricePerPage: point.pricePerPageBw,
    total: point.pricePerPageBw * 12 * 2,
  })),
} satisfies ApiSchema<"Quote">;

vi.mock("next/link", () => ({
  default: ({ children, href, onNavigate }: {
    children: React.ReactNode; href: string; onNavigate?: (event: { preventDefault(): void }) => void;
  }) => <a href={href} onClick={(event) => { event.preventDefault(); onNavigate?.(event); }}>{children}</a>,
}));

describe("PointSelector", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("shows a loading state while points are requested", () => {
    const listPrintPoints = vi.fn<ListPrintPoints>(() => new Promise(() => undefined));

    render(<PointSelector listPrintPoints={listPrintPoints} />);

    expect(screen.getByRole("status", { name: "Загружаем точки печати" }))
      .toHaveAttribute("aria-busy", "true");
  });

  it("renders contract points with hours and ruble prices", async () => {
    const listPrintPoints = vi.fn<ListPrintPoints>().mockResolvedValue(response);

    render(<PointSelector listPrintPoints={listPrintPoints} />);

    expect(await screen.findByRole("radio", { name: /CopyHouse Дорожная/ }))
      .toBeInTheDocument();
    expect(screen.getByText("Ежедневно, 09:00–21:00")).toBeInTheDocument();
    expect(screen.getByText(/5,00\s*₽/)).toBeInTheDocument();
    expect(screen.getByText(/20,00\s*₽/)).toBeInTheDocument();
  });

  it("renders a read-only catalog without changing saved selection", async () => {
    sessionStorage.setItem(SELECTED_PRINT_POINT_KEY, "saved-point");
    const listPrintPoints = vi.fn<ListPrintPoints>().mockResolvedValue(response);

    render(<PointSelector listPrintPoints={listPrintPoints} selectable={false} />);

    expect(await screen.findByText("CopyHouse Дорожная")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByText("Выбрать")).not.toBeInTheDocument();
    expect(sessionStorage.getItem(SELECTED_PRINT_POINT_KEY)).toBe("saved-point");
  });

  it("loads every catalog page before rendering the selector", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: printPointFixtures.slice(0, 2),
        pagination: { page: 1, limit: 2, totalItems: 3, totalPages: 2 },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        items: printPointFixtures.slice(2, 3),
        pagination: { page: 2, limit: 2, totalItems: 3, totalPages: 2 },
      }), { status: 200 }));

    await expect(listPrintPoints("Новый город")).resolves.toEqual(printPointFixtures.slice(0, 3));
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `/api/print-points?page=1&limit=100&${new URLSearchParams({ city: "Новый город" })}`,
      { cache: "no-store" },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `/api/print-points?page=2&limit=100&${new URLSearchParams({ city: "Новый город" })}`,
      { cache: "no-store" },
    );
  });

  it("saves and restores the selected point", async () => {
    const user = userEvent.setup();
    const listPrintPoints = vi.fn<ListPrintPoints>().mockResolvedValue(response);
    const { unmount } = render(<PointSelector listPrintPoints={listPrintPoints} />);
    const point = await screen.findByRole("radio", { name: /CopyHouse Тверская/ });

    await user.click(point);

    expect(point).toBeChecked();
    expect(sessionStorage.getItem(SELECTED_PRINT_POINT_KEY))
      .toBe(printPointFixtures[1].id);

    unmount();
    render(<PointSelector listPrintPoints={listPrintPoints} />);

    expect(await screen.findByRole("radio", { name: /CopyHouse Тверская/ }))
      .toBeChecked();
  });

  it("compares server totals and saves the selected offer for checkout", async () => {
    const user = userEvent.setup();
    const createQuote = vi.fn().mockResolvedValue(quote);
    savePrintOptions(printOptions);

    render(
      <PointSelector
        documentId={printOptions.documentId}
        createQuote={createQuote}
        continueHref="/checkout/document-id"
        continueLabel="Перейти к подтверждению"
      />,
    );

    expect(await screen.findByText(/120,00\s*₽/)).toBeVisible();
    expect(screen.getByText(/144,00\s*₽/)).toBeVisible();
    expect(createQuote).toHaveBeenCalledWith(printOptions);
    expect(screen.queryByRole("link", { name: "Перейти к подтверждению" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /CopyHouse Тверская/ }));
    const checkout = screen.getByRole("link", { name: "Перейти к подтверждению" });
    expect(checkout).toHaveAttribute("href", "/checkout/document-id");
    await user.click(checkout);
    expect(readPrintSettings(printOptions.documentId)).toMatchObject({
      quoteId: quote.id,
      printPointId: response[1].id,
      total: 14400,
    });
  });

  it("preselects a catalogue choice if it has a matching offer", async () => {
    sessionStorage.setItem(SELECTED_PRINT_POINT_KEY, response[0].id);
    saveUploadedDocument({ ...uploadedDocumentFixture, id: printOptions.documentId });
    savePrintOptions(printOptions);
    render(<PointSelector documentId={printOptions.documentId} createQuote={async () => quote} />);
    expect(await screen.findByRole("radio", { name: /CopyHouse Дорожная/ })).toBeChecked();
  });

  it("explains when the saved point is unavailable and lets the user pick another", async () => {
    sessionStorage.setItem(SELECTED_PRINT_POINT_KEY, "point-in-another-city");
    saveUploadedDocument({ ...uploadedDocumentFixture, id: printOptions.documentId });
    savePrintOptions(printOptions);
    render(<PointSelector documentId={printOptions.documentId} createQuote={async () => quote} />);
    expect(await screen.findByText("Выбранный ранее копицентр недоступен для этого заказа. Выберите другой.")).toBeVisible();
    expect(screen.getByRole("radio", { name: /CopyHouse Дорожная/ })).not.toBeChecked();
  });

  it("retries a failed quote and keeps valid options", async () => {
    const user = userEvent.setup();
    const createQuote = vi.fn().mockRejectedValueOnce(new Error("Не удалось рассчитать цены"))
      .mockResolvedValueOnce({ ...quote, offers: [] });
    savePrintOptions(printOptions);
    render(<PointSelector documentId={printOptions.documentId} createQuote={createQuote} />);
    await screen.findByRole("alert");
    await user.tab();
    expect(screen.getByRole("button", { name: "Повторить" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Нет предложений для этих параметров")).toBeVisible();
    expect(screen.getByRole("status")).toHaveFocus();
    expect(createQuote).toHaveBeenLastCalledWith(printOptions);
  });

  it("shows the approved empty catalogue text", async () => {
    const listPrintPoints = vi.fn<ListPrintPoints>().mockResolvedValue([]);

    render(<PointSelector listPrintPoints={listPrintPoints} />);

    expect(await screen.findByText("В вашем городе пока нет точек печати"))
      .toBeInTheDocument();
    expect(screen.getByText("Попробуйте зайти позже."))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Обновить список" })).toBeEnabled();
  });

  it("shows an error and retries the request", async () => {
    const user = userEvent.setup();
    const listPrintPoints = vi
      .fn<ListPrintPoints>()
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockResolvedValueOnce(response);

    render(<PointSelector listPrintPoints={listPrintPoints} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось загрузить точки",
    );
    expect(screen.queryByText("Failed to fetch")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Повторить" }));

    expect(await screen.findByRole("radio", { name: /CopyHouse Дорожная/ }))
      .toBeInTheDocument();
    await waitFor(() => expect(listPrintPoints).toHaveBeenCalledTimes(2));
  });
});
