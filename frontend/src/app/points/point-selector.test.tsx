import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { printPointFixtures } from "@/shared/api/contract-fixtures";
import {
  listPrintPoints,
  PointSelector,
  type ListPrintPoints,
} from "./point-selector";
import { SELECTED_PRINT_POINT_KEY } from "@/shared/order-draft";

const response = printPointFixtures.slice(0, 2);

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

    await expect(listPrintPoints()).resolves.toEqual(printPointFixtures.slice(0, 3));
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/print-points?page=1&limit=100",
      { cache: "no-store" },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/print-points?page=2&limit=100",
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

  it("opens print settings after a point is selected", async () => {
    const user = userEvent.setup();
    const listPrintPoints = vi.fn<ListPrintPoints>().mockResolvedValue(response);

    render(
      <PointSelector
        listPrintPoints={listPrintPoints}
        continueHref="/configure/document-id"
      />,
    );

    expect(screen.queryByRole("link", { name: "Настроить печать" }))
      .not.toBeInTheDocument();
    await user.click(await screen.findByRole("radio", { name: /CopyHouse Дорожная/ }));

    expect(screen.getByRole("link", { name: "Настроить печать" }))
      .toHaveAttribute("href", "/configure/document-id");
  });

  it("shows the approved empty catalogue text", async () => {
    const listPrintPoints = vi.fn<ListPrintPoints>().mockResolvedValue([]);

    render(<PointSelector listPrintPoints={listPrintPoints} />);

    expect(await screen.findByText("В вашем городе пока нет точек печати"))
      .toBeInTheDocument();
    expect(screen.getByText("Когда точки появятся, они будут показаны здесь."))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Обновить" })).toBeEnabled();
  });

  it("shows an error and retries the request", async () => {
    const user = userEvent.setup();
    const listPrintPoints = vi
      .fn<ListPrintPoints>()
      .mockRejectedValueOnce(new Error("Нет соединения. Проверьте интернет и повторите попытку."))
      .mockResolvedValueOnce(response);

    render(<PointSelector listPrintPoints={listPrintPoints} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Нет соединения. Проверьте интернет и повторите попытку.",
    );
    await user.click(screen.getByRole("button", { name: "Повторить" }));

    expect(await screen.findByRole("radio", { name: /CopyHouse Дорожная/ }))
      .toBeInTheDocument();
    await waitFor(() => expect(listPrintPoints).toHaveBeenCalledTimes(2));
  });
});
