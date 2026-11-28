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
    errors.password = "Укажите от 8 до 72 символов, включая латинскую букву и цифру.";
  }
  if (!input.city.trim()) errors.city = "Укажите город";
  if (input.role !== "CLIENT" && input.role !== "PrintProvider") {
    errors.role = "Выберите тип аккаунта";
  }
  return errors;
}

export function routeForUser(user: User) {
  if (user.role === "ADMIN") return routes.adminPoints;
  if (user.role === "PrintProvider") return routes.provider;
  return routes.upload;
}
