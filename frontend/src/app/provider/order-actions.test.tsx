import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OrderActions } from "./order-actions";
import { changePointOrder } from "./actions";

vi.mock("./actions", () => ({ changePointOrder: vi.fn() }));
const orderId = "11111111-2222-4333-8444-555555555555";

describe("OrderActions", () => {
  it("sends the selected status action and keeps the conflict visible after refreshing the details", async () => {
    vi.mocked(changePointOrder).mockResolvedValueOnce({ error: "Заказ уже принят или изменён другим сотрудником" });
    const { rerender } = render(<OrderActions orderId={orderId} status="PAID" />);
    await userEvent.click(screen.getByRole("button", { name: "Принять в печать" }));
    const form = vi.mocked(changePointOrder).mock.calls.at(-1)?.[1];
    expect(form?.get("operation")).toBe("start");
    expect(form?.get("orderId")).toBe(orderId);
    rerender(<OrderActions orderId={orderId} status="PRINTING" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Заказ уже принят или изменён другим сотрудником");
    expect(screen.getByRole("button", { name: "Готов к выдаче" })).toBeInTheDocument();
  });

  it("preserves leading zeroes and keeps the code available for correction", async () => {
    vi.mocked(changePointOrder).mockResolvedValueOnce({ fieldError: "Неверный код выдачи" });
    render(<OrderActions orderId={orderId} status="READY" />);
    const code = screen.getByRole("textbox", { name: "Код выдачи" });
    await userEvent.type(code, "012345");
    await userEvent.click(screen.getByRole("button", { name: "Выдать заказ" }));
    expect(vi.mocked(changePointOrder).mock.calls.at(-1)?.[1].get("code")).toBe("012345");
    expect(await screen.findByText("Неверный код выдачи")).toBeInTheDocument();
    expect(code).toHaveValue("012345");
    expect(code).toHaveAttribute("aria-invalid", "true");
  });
});
