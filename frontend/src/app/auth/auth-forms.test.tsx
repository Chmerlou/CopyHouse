import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm, RegisterForm } from "./auth-forms";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
  vi.unstubAllGlobals();
});

describe("LoginForm", () => {
  it("shows accessible field errors before sending", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<LoginForm returnTo="/upload" />);

    await user.click(screen.getByRole("button", { name: "Войти" }));

    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "Укажите корректный адрес электронной почты",
    );
    expect(screen.getByLabelText("Пароль")).toHaveAccessibleDescription("Введите пароль");
    expect(screen.getByLabelText("Email")).toHaveFocus();
    await user.type(screen.getByLabelText("Email"), "client@copyhouse.test");
    await user.click(screen.getByRole("button", { name: "Войти" }));
    expect(screen.getByLabelText("Пароль")).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps email, clears password and shows a neutral 401 message", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ code: "INVALID_CREDENTIALS", message: "wrong" }),
    }));
    render(<LoginForm returnTo="/upload" />);

    await user.type(screen.getByLabelText("Email"), "client@copyhouse.test");
    await user.type(screen.getByLabelText("Пароль"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Неверный email или пароль");
    expect(screen.getByLabelText("Email")).toHaveValue("client@copyhouse.test");
    expect(screen.getByLabelText("Пароль")).toHaveValue("");
    expect(screen.getByLabelText("Пароль")).toHaveFocus();
  });

  it("returns a client to the protected route and routes provider to its panel", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ user: {
          id: "1", email: "client@copyhouse.test", city: "Москва", role: "CLIENT",
        } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ user: {
          id: "2", email: "provider@copyhouse.test", city: "Москва", role: "PrintProvider",
        } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const first = render(<LoginForm returnTo="/upload" />);
    await user.type(screen.getByLabelText("Email"), "client@copyhouse.test");
    await user.type(screen.getByLabelText("Пароль"), "password1");
    await user.click(screen.getByRole("button", { name: "Войти" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/upload"));

    first.unmount();
    render(<LoginForm returnTo="/upload" />);
    await user.type(screen.getByLabelText("Email"), "provider@copyhouse.test");
    await user.type(screen.getByLabelText("Пароль"), "password1");
    await user.click(screen.getByRole("button", { name: "Войти" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/provider"));
  });

  it("does not submit twice while a request is pending", async () => {
    let resolveRequest!: (value: unknown) => void;
    const fetchMock = vi.fn(() => new Promise((resolve) => { resolveRequest = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    render(<LoginForm returnTo="/upload" initialEmail="client@copyhouse.test" />);
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "password1" } });

    const form = screen.getByRole("button", { name: "Войти" }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveRequest({ ok: false, status: 500, json: async () => ({}) });
  });
});

describe("RegisterForm", () => {
  it("registers a PrintProvider and moves to login", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal("fetch", fetchMock);
    render(<RegisterForm returnTo="/upload" />);

    await user.click(screen.getByLabelText("Для копицентра"));
    await user.type(screen.getByLabelText("Email"), "office@copyhouse.test");
    await user.type(screen.getByLabelText("Пароль"), "password1");
    await user.type(screen.getByLabelText("Город"), "Москва");
    await user.click(screen.getByRole("button", { name: "Создать аккаунт" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/register", expect.objectContaining({
      body: JSON.stringify({
        email: "office@copyhouse.test",
        password: "password1",
        city: "Москва",
        role: "PrintProvider",
      }),
    }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining("/login?")));
  });
});
