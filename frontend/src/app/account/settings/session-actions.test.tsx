import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { SessionActions } from "./session-actions";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

it("requires confirmation before logging out everywhere and redirects after success", async () => {
  const user = userEvent.setup();
  const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
  render(<SessionActions canLogoutEverywhere />);
  const button = screen.getByRole("button", { name: "Выйти со всех устройств" });

  await user.click(button);
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(fetchMock).not.toHaveBeenCalled();
  await user.click(button);
  expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout/all", { method: "POST" });
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
  expect(button).toBeEnabled();
});
