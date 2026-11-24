import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/shared/auth/server", () => ({ getCurrentUser: auth.getCurrentUser }));
vi.mock("./point-selector", () => ({
  PointSelector: ({ selectable }: { selectable?: boolean }) => (
    <div data-testid="point-selector" data-selectable={String(selectable)} />
  ),
}));

import { PointsContent } from "./points-content";

describe("PointsContent", () => {
  beforeEach(() => auth.getCurrentUser.mockReset());

  it("shows the catalog to a guest without selection controls", async () => {
    auth.getCurrentUser.mockResolvedValue(null);

    render(await PointsContent({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Точки печати" })).toBeInTheDocument();
    expect(screen.getByTestId("point-selector")).toHaveAttribute("data-selectable", "false");
    expect(screen.getByRole("link", { name: "Войти и начать заказ" }))
      .toHaveAttribute("href", "/login?returnTo=%2Fupload");
  });

  it("enables selection for a client with an uploaded document", async () => {
    auth.getCurrentUser.mockResolvedValue({
      id: "client-id",
      email: "client@copyhouse.test",
      role: "CLIENT",
      city: "Москва",
    });

    render(await PointsContent({
      searchParams: Promise.resolve({ documentId: "document-id" }),
    }));

    expect(screen.getByRole("heading", { name: "Выберите точку печати" })).toBeInTheDocument();
    expect(screen.getByTestId("point-selector")).toHaveAttribute("data-selectable", "true");
    expect(screen.queryByRole("link", { name: "Войти и начать заказ" }))
      .not.toBeInTheDocument();
  });

  it("keeps the catalog read-only for a client without a document", async () => {
    auth.getCurrentUser.mockResolvedValue({
      id: "client-id",
      email: "client@copyhouse.test",
      role: "CLIENT",
      city: "Москва",
    });

    render(await PointsContent({ searchParams: Promise.resolve({}) }));

    expect(screen.getByTestId("point-selector")).toHaveAttribute("data-selectable", "false");
    expect(screen.getByRole("link", { name: "Загрузить документ" }))
      .toHaveAttribute("href", "/upload");
  });

  it("keeps the catalog read-only for a print provider", async () => {
    auth.getCurrentUser.mockResolvedValue({
      id: "provider-id",
      email: "provider@copyhouse.test",
      role: "PrintProvider",
      city: "Москва",
    });

    render(await PointsContent({
      searchParams: Promise.resolve({ documentId: "document-id" }),
    }));

    expect(screen.getByTestId("point-selector")).toHaveAttribute("data-selectable", "false");
    expect(screen.getByRole("link", { name: "Вернуться в панель" }))
      .toHaveAttribute("href", "/provider");
  });
});
