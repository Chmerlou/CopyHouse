import "server-only";

import { randomUUID } from "node:crypto";
import type { LoginInput, RegisterInput, User } from "./contracts";
import {
  passwordDigest,
  signRegisteredAccount,
  verifyRegisteredAccount,
} from "./mock-token";

type MockAccount = User & { password: string };

const accounts = new Map<string, MockAccount>([
  ["client@copyhouse.test", {
    id: "f41c7f31-8b62-4c78-93dd-6a4d68d5d101",
    email: "client@copyhouse.test",
    password: "password1",
    role: "CLIENT",
    city: "Москва",
  }],
  ["provider@copyhouse.test", {
    id: "b96d4ca5-f817-4707-9f40-4ebf804b6902",
    email: "provider@copyhouse.test",
    password: "password1",
    role: "PrintProvider",
    city: "Москва",
  }],
]);

function publicUser(account: MockAccount): User {
  return {
    id: account.id,
    email: account.email,
    role: account.role,
    city: account.city,
  };
}

export function registerMockAccount(input: RegisterInput, registeredToken?: string) {
  const email = input.email.trim().toLowerCase();
  const registered = verifyRegisteredAccount(registeredToken);
  if (accounts.has(email) || registered?.user.email === email) return null;

  const account: MockAccount = {
    id: randomUUID(),
    email,
    password: input.password,
    role: input.role,
    city: input.city.trim(),
  };
  const user = publicUser(account);
  return { user, accountToken: signRegisteredAccount(user, input.password) };
}

export function loginMockAccount(input: LoginInput, registeredToken?: string) {
  const email = input.email.trim().toLowerCase();
  const account = accounts.get(email);
  if (account?.password === input.password) return publicUser(account);

  const registered = verifyRegisteredAccount(registeredToken);
  if (
    registered?.user.email === email
    && registered.passwordDigest === passwordDigest(input.password)
  ) {
    return registered.user;
  }
  return null;
}
