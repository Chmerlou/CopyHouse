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
    expect(screen.getByText("После оплаты мы передадим заказ в копицентр.")).toBeVisible();
    expect(screen.getByText("Тестовая оплата. Деньги не спишутся.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Оплатить заказ" }));

    expect(await screen.findByText("Оплата прошла")).toBeInTheDocument();
    expect(screen.getByText("Тестовая оплата прошла без списания денег.")).toBeVisible();
    expect(screen.getByText(/Код выдачи появится/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Мои заказы" })).toHaveAttribute("href", "/account/orders");
    expect(payOrder).toHaveBeenCalledWith(created.id, "SUCCESS");
  });

  it("keeps the test payment available after failure", async () => {
    const user = userEvent.setup();
    const created = orderFixtures[0];
    const failed = { ...created, payment: { status: "FAILED" as const, amount: created.total } };
    render(<OrderView orderId={created.id} loadOrder={vi.fn<LoadOrder>().mockResolvedValue(created)} payOrder={vi.fn<PayOrder>().mockResolvedValue(failed)} />);
    await screen.findByText("Ожидает оплаты");
    await user.click(screen.getByRole("button", { name: "Оплатить заказ" }));
    expect(await screen.findByText("Оплата не прошла")).toBeInTheDocument();
    expect(screen.getByText("Повторите оплату, чтобы передать заказ в печать.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Оплатить заказ" })).toBeEnabled();
  });

  it("keeps the current status after a failed refresh, then shows the pickup code when ready", async () => {
    const user = userEvent.setup();
    const printing = orderFixtures[2];
    const ready = { ...printing, status: "READY" as const, pickupCode: "048231" };
    const loadOrder = vi.fn<LoadOrder>()
      .mockResolvedValueOnce(printing)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(ready);
    render(<OrderView orderId={printing.id} loadOrder={loadOrder} />);

    expect(await screen.findByRole("heading", { name: "Заказ печатают" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Оплатить заказ" })).not.toBeInTheDocument();
    expect(screen.queryByText("048231")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Обновить статус" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось обновить статус");
    expect(screen.getByRole("heading", { name: "Заказ печатают" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Обновить статус" }));
    expect(await screen.findByRole("heading", { name: "Заказ готов к выдаче" })).toBeVisible();
    expect(screen.getByText("048231")).toBeVisible();
  });

  it("does not show payment controls or pickup codes for finished orders", async () => {
    const issued = orderFixtures[4];
    render(<OrderView orderId={issued.id} loadOrder={vi.fn<LoadOrder>().mockResolvedValue(issued)} />);
    expect(await screen.findByRole("heading", { name: "Заказ выдан" })).toBeVisible();
    expect(screen.queryByText(issued.pickupCode!)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Оплатить заказ" })).not.toBeInTheDocument();
  });
});
