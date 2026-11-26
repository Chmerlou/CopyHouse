import { describe, expect, it } from "vitest";
import { routeForUser, validateLogin, validateRegistration } from "./contracts";

describe("auth contracts", () => {
  it("validates login without exposing which credential is wrong", () => {
    expect(validateLogin({ email: "wrong", password: "" })).toEqual({
      email: "Укажите корректный адрес электронной почты",
      password: "Введите пароль",
    });
  });

  it("accepts registration for client and PrintProvider", () => {
    for (const role of ["CLIENT", "PrintProvider"] as const) {
      expect(validateRegistration({
        email: `${role}@copyhouse.test`,
        password: "password1",
        city: "Москва",
        role,
      })).toEqual({});
    }
  });

  it("routes each role to its own workspace", () => {
    expect(routeForUser({ id: "1", email: "a@b.ru", city: "Москва", role: "CLIENT" }))
      .toBe("/upload");
    expect(routeForUser({ id: "2", email: "p@b.ru", city: "Москва", role: "PrintProvider" }))
      .toBe("/provider");
    expect(routeForUser({ id: "3", email: "admin@b.ru", city: "Москва", role: "ADMIN" }))
      .toBe("/admin/print-points");
  });
});
