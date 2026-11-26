import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { PointSwitcher } from "./point-switcher";

afterEach(() => vi.restoreAllMocks());

it("balances unique points in rows and names each point with its full address", async () => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(460);
  const points = Array.from({ length: 7 }, (_, index) => ({
    id: String(index), address: `ул. Дорожная, дом ${index + 1}`,
  }));
  const selectPoint = vi.fn();
  render(<PointSwitcher points={points} selectedId="0" selectPoint={selectPoint} />);

  const group = screen.getByRole("group", { name: "Точки печати" });
  expect(within(group).getAllByRole("list").map((row) => within(row).getAllByRole("button").length))
    .toEqual([3, 2, 2]);
  const selected = within(group).getByRole("button", { name: points[0].address, pressed: true });
  expect(selected).toHaveTextContent("ул. Дорож...");
  const next = within(group).getByRole("button", { name: points[1].address, pressed: false });
  expect(next).toHaveAttribute("title", points[1].address);
  await userEvent.click(next);
  expect(selectPoint.mock.calls[0][0].get("pointId")).toBe("1");
});
