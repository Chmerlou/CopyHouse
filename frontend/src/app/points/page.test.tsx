import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  dataSource: "mock",
}));

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/shared/auth/server", () => ({
  getCurrentUser: auth.getCurrentUser,
  get dataSource() { return auth.dataSource; },
}));
vi.mock("./point-selector", () => ({
  PointSelector: ({ selectable, city, documentId, continueHref, continueLabel }: {
    selectable?: boolean; city?: string; documentId?: string; continueHref?: string; continueLabel?: string;
  }) => (
    <div data-testid="point-selector" data-selectable={String(selectable)} data-city={city} data-document={documentId}>
      {continueHref && <a href={continueHref}>{continueLabel}</a>}
    </div>
  ),
}));

import { PointsContent } from "./points-content";

describe("PointsContent", () => {
  beforeEach(() => {
    auth.getCurrentUser.mockReset();
    auth.dataSource = "mock";
  });

  it("asks for a city before loading the live guest catalog", async () => {
    auth.dataSource = "live";
    auth.getCurrentUser.mockResolvedValue(null);

    const { rerender } = render(await PointsContent({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("textbox", { name: "Город" })).toBeRequired();
    expect(screen.queryByTestId("point-selector")).not.toBeInTheDocument();

    rerender(await PointsContent({ searchParams: Promise.resolve({ city: "Калуга" }) }));
    expect(screen.getByTestId("point-selector")).toHaveAttribute("data-city", "Калуга");
  });

  it("lets a guest save a point before starting an order", async () => {
    auth.getCurrentUser.mockResolvedValue(null);

    render(await PointsContent({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Точки печати" })).toBeInTheDocument();
    expect(screen.getByTestId("point-selector")).toHaveAttribute("data-selectable", "true");
    expect(screen.getByRole("link", { name: "Войти и начать заказ" }))
      .toHaveAttribute("href", "/login?returnTo=%2Fupload");
  });

  it("compares prices for a client with an uploaded document", async () => {
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
    expect(screen.getByTestId("point-selector")).toHaveAttribute("data-document", "document-id");
    expect(screen.getByRole("link", { name: "Перейти к подтверждению" })).toHaveAttribute("href", "/checkout/document-id");
    expect(screen.queryByRole("link", { name: "Войти и начать заказ" }))
      .not.toBeInTheDocument();
  });

  it("lets a client choose a point before uploading a document", async () => {
    auth.getCurrentUser.mockResolvedValue({
      id: "client-id",
      email: "client@copyhouse.test",
      role: "CLIENT",
      city: "Москва",
    });

    render(await PointsContent({ searchParams: Promise.resolve({}) }));

    expect(screen.getByTestId("point-selector")).toHaveAttribute("data-selectable", "true");
    expect(screen.getByTestId("point-selector")).not.toHaveAttribute("data-document");
    expect(screen.getByRole("link", { name: "Загрузить PDF" }))
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
    expect(screen.getByRole("link", { name: "Вернуться в панель точки" }))
      .toHaveAttribute("href", "/provider");
  });
});
