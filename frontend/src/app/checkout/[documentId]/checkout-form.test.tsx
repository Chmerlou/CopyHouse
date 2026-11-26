import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { savePendingDocuments, savePrintSettings } from "@/shared/order-draft";
import { CheckoutForm, type CreateOrder } from "./checkout-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("CheckoutForm", () => {
  beforeEach(() => {
    sessionStorage.clear();
    push.mockReset();
    savePendingDocuments([{ id: "document-one", originalName: "lecture.pdf", sizeBytes: 1024, pageCount: 12, createdAt: "2026-11-23T10:00:00.000Z" }]);
    savePrintSettings({
      documentId: "document-one", colorMode: "BW", copies: 2,
      quoteId: "quote-one", printPointId: "point-one",
      printPointName: "CopyHouse Дорожная", printPointAddress: "ул. Дорожная, д.8",
      pricePerPage: 500, total: 12000, expiresAt: "2099-11-23T10:15:00.000Z",
    });
  });

  it("shows the one-file summary and creates an order with a stable idempotency key", async () => {
    const user = userEvent.setup();
    const createOrder = vi.fn<CreateOrder>().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ id: "order-one" });
    render(<CheckoutForm documentId="document-one" createOrder={createOrder} />);

    expect(screen.getByText("lecture.pdf")).toBeInTheDocument();
    expect(screen.getByText("CopyHouse Дорожная")).toBeInTheDocument();
    expect(screen.getByText(/120,00\s*₽/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Оформить заказ" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось оформить заказ");
    await user.click(screen.getByRole("button", { name: "Повторить" }));

    expect(createOrder).toHaveBeenCalledTimes(2);
    expect(createOrder.mock.calls[0][0]).toEqual(createOrder.mock.calls[1][0]);
    expect(createOrder.mock.calls[0][1]).toBe(createOrder.mock.calls[1][1]);
    expect(push).toHaveBeenCalledWith("/orders/order-one");
  });

  it("returns the user to comparison when the backend price changes", async () => {
    const user = userEvent.setup();
    const createOrder = vi.fn<CreateOrder>().mockRejectedValue(new Error("PRICE_CHANGED"));
    render(<CheckoutForm documentId="document-one" createOrder={createOrder} />);

    await user.click(screen.getByRole("button", { name: "Оформить заказ" }));
    expect(await screen.findByRole("link", { name: "Пересчитать цены" }))
      .toHaveAttribute("href", "/points?documentId=document-one");
    expect(push).not.toHaveBeenCalled();
  });
});
