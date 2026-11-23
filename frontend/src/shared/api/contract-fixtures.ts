import type { ApiSchema } from "./contract";

export const guestFixture = null;

export const clientFixture = {
  id: "f41c7f31-8b62-4c78-93dd-6a4d68d5d101",
  email: "client@copyhouse.test",
  role: "CLIENT",
  city: "Москва",
} satisfies ApiSchema<"User">;

export const printProviderFixture = {
  id: "b96d4ca5-f817-4707-9f40-4ebf804b6902",
  email: "provider@copyhouse.test",
  role: "PrintProvider",
  city: "Москва",
} satisfies ApiSchema<"User">;

export const printPointFixtures = [
  {
    id: "563e1e33-dbbc-4de5-bec0-4bf830594001",
    name: "CopyHouse Дорожная",
    city: "Москва",
    address: "ул. Дорожная, д.8",
    workingHours: "Ежедневно, 09:00–21:00",
    pricePerPageBw: 500,
    pricePerPageColor: 2000,
  },
  {
    id: "563e1e33-dbbc-4de5-bec0-4bf830594002",
    name: "CopyHouse Тверская",
    city: "Москва",
    address: "ул. Тверская, д.15",
    workingHours: "Пн–Сб, 08:00–22:00",
    pricePerPageBw: 600,
    pricePerPageColor: 2200,
  },
  {
    id: "563e1e33-dbbc-4de5-bec0-4bf830594003",
    name: "CopyHouse Академика Королёва",
    city: "Москва",
    address: "ул. Академика Королёва, д.12",
    workingHours: "Ежедневно, 10:00–20:00",
    pricePerPageBw: 450,
    pricePerPageColor: 1900,
  },
  {
    id: "563e1e33-dbbc-4de5-bec0-4bf830594004",
    name: "CopyHouse Профсоюзная",
    city: "Москва",
    address: "ул. Профсоюзная, д.42",
    workingHours: "Круглосуточно",
    pricePerPageBw: 700,
    pricePerPageColor: 2500,
  },
  {
    id: "563e1e33-dbbc-4de5-bec0-4bf830594005",
    name: "CopyHouse Новый Арбат",
    city: "Москва",
    address: "ул. Новый Арбат, д.19",
    workingHours: "Ежедневно, 09:00–23:00",
    pricePerPageBw: 550,
    pricePerPageColor: 2100,
  },
] satisfies ApiSchema<"PrintPointPublic">[];

export const providerPointFixtures = printPointFixtures.slice(0, 3).map((point) => ({
  ...point,
  status: "APPROVED" as const,
  isActive: true,
  rejectionReason: null,
  commissionBps: 0,
})) satisfies ApiSchema<"PrintPointOwner">[];

export const uploadedDocumentFixture = {
  id: "65474f8d-e969-4d83-8935-df69d1008069",
  originalName: "lecture.pdf",
  sizeBytes: 524_288,
  pageCount: 12,
  createdAt: "2026-11-23T10:00:00.000Z",
} satisfies ApiSchema<"Document">;

export const apiErrorFixtures = {
  invalidPdf: {
    statusCode: 400,
    code: "INVALID_PDF",
    message: "Файл повреждён или не является корректным PDF",
  },
  unsupportedFileType: {
    statusCode: 415,
    code: "UNSUPPORTED_FILE_TYPE",
    message: "Поддерживается только PDF",
  },
  fileTooLarge: {
    statusCode: 413,
    code: "FILE_TOO_LARGE",
    message: "Максимальный размер файла — 50 МБ",
  },
  unauthorized: {
    statusCode: 401,
    code: "UNAUTHORIZED",
    message: "Требуется авторизация",
  },
  internal: {
    statusCode: 500,
    code: "INTERNAL_ERROR",
    message: "Не удалось выполнить операцию",
  },
} satisfies Record<string, ApiSchema<"Error">>;

export const orderStatuses = [
  "CREATED",
  "PAID",
  "PRINTING",
  "READY",
  "ISSUED",
  "CANCELLED",
] satisfies ApiSchema<"OrderStatus">[];

export const orderFixtures = orderStatuses.map((status, index) => ({
  id: `763e1e33-dbbc-4de5-bec0-4bf83059400${index}`,
  status,
  createdAt: `2026-11-${String(20 + index).padStart(2, "0")}T10:00:00.000Z`,
  updatedAt: `2026-11-${String(20 + index).padStart(2, "0")}T10:05:00.000Z`,
  printPoint: {
    id: printPointFixtures[index % printPointFixtures.length].id,
    name: printPointFixtures[index % printPointFixtures.length].name,
    city: printPointFixtures[index % printPointFixtures.length].city,
    address: printPointFixtures[index % printPointFixtures.length].address,
  },
  document: {
    id: `863e1e33-dbbc-4de5-bec0-4bf83059400${index}`,
    originalName: `document-${index + 1}.pdf`,
    pageCount: 12,
  },
  colorMode: index % 2 ? "COLOR" as const : "BW" as const,
  copies: 1,
  pageCount: 12,
  unitPrice: index % 2 ? 2000 : 500,
  subtotal: index % 2 ? 24_000 : 6_000,
  commissionBps: 0,
  commissionAmount: 0,
  total: index % 2 ? 24_000 : 6_000,
  currency: "RUB" as const,
  payment: status === "CREATED" ? null : {
    status: status === "CANCELLED" ? "REFUNDED" as const : "SUCCEEDED" as const,
    amount: index % 2 ? 24_000 : 6_000,
  },
  pickupCode: status === "READY" || status === "ISSUED" ? "482731" : null,
})) satisfies ApiSchema<"OrderClient">[];
