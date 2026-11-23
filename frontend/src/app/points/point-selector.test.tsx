import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { printPointFixtures } from "@/shared/api/contract-fixtures";
import {
  PointSelector,
  SELECTED_PRINT_POINT_KEY,
  type ListPrintPoints,
} from "./point-selector";

const response = {
  items: printPointFixtures.slice(0, 2),
  pagination: {
    page: 1,
    limit: 20,
    totalItems: 2,
    totalPages: 1,
  },
};

describe("PointSelector", () => {
  beforeEach(() => sessionStorage.clear());

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

  it("shows the approved empty catalogue text", async () => {
    const listPrintPoints = vi.fn<ListPrintPoints>().mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });

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
