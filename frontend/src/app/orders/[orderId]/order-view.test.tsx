import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { orderFixtures } from "@/shared/api/contract-fixtures";
import { OrderView, type LoadOrder, type PayOrder } from "./order-view";

describe("OrderView", () => {
  it("pays a created order with the internal test button", async () => {
    const user = userEvent.setup();
    const created = orderFixtures[0];
    const paid = { ...created, status: "PAID" as const, payment: { status: "SUCCEEDED" as const, amount: created.total } };
    const payOrder = vi.fn<PayOrder>().mockResolvedValue(paid);
    render(<OrderView orderId={created.id} loadOrder={vi.fn<LoadOrder>().mockResolvedValue(created)} payOrder={payOrder} />);

    expect(await screen.findByText("Ожидает оплаты")).toBeInTheDocument();
    expect(screen.getByText("Заказ оформлен")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Оплатить (тест)" }));

    expect(await screen.findByText("Оплата прошла")).toBeInTheDocument();
    expect(screen.getByText("Заказ ожидает печати.")).toBeInTheDocument();
    expect(screen.getByText("Оплачен")).toBeInTheDocument();
    expect(payOrder).toHaveBeenCalledWith(created.id, "SUCCESS");
  });

  it("keeps the test payment available after failure", async () => {
    const user = userEvent.setup();
    const created = orderFixtures[0];
    const failed = { ...created, payment: { status: "FAILED" as const, amount: created.total } };
    render(<OrderView orderId={created.id} loadOrder={vi.fn<LoadOrder>().mockResolvedValue(created)} payOrder={vi.fn<PayOrder>().mockResolvedValue(failed)} />);
    await screen.findByText("Ожидает оплаты");
    await user.click(screen.getByRole("button", { name: "Оплатить (тест)" }));
    expect(await screen.findByText("Оплата не прошла")).toBeInTheDocument();
    expect(screen.getByText("Заказ не оплачен. Можно повторить попытку.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Оплатить (тест)" })).toBeEnabled();
  });
});
