import type { ApiSchema } from "@/shared/api/contract";
import { routes } from "@/shared/routes";

export type User = ApiSchema<"User">;
export type RegisterRole = ApiSchema<"RegisterRole">;

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = LoginInput & {
  role: RegisterRole;
  city: string;
};

export type FieldErrors = Partial<Record<keyof RegisterInput, string>>;

export function validateLogin(input: LoginInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) {
    errors.email = "Укажите корректный адрес электронной почты";
  }
  if (!input.password) errors.password = "Введите пароль";
  return errors;
}

export function validateRegistration(input: RegisterInput): FieldErrors {
  const errors = validateLogin(input);
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(input.password)) {
    errors.password = "От 8 до 72 символов, минимум одна латинская буква и одна цифра";
  }
  if (!input.city.trim()) errors.city = "Укажите город";
  if (input.role !== "CLIENT" && input.role !== "PrintProvider") {
    errors.role = "Выберите тип аккаунта";
  }
  return errors;
}

export function routeForUser(user: User) {
  return user.role === "PrintProvider" ? routes.provider : routes.upload;
}
