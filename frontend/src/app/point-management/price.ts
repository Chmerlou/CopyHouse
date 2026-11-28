const currency = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function displayPrice(kopecks: number) {
  return currency.format(kopecks / 100);
}

export function priceInput(kopecks: number) {
  return (kopecks / 100).toFixed(2).replace(".", ",");
}

export function readPrice(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,8})(?:[,.](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;

  const [, rubles, fraction = ""] = match;
  const kopecks = Number(rubles) * 100 + Number(fraction.padEnd(2, "0"));
  // Prisma stores these prices as PostgreSQL Int values.
  return kopecks > 0 && kopecks <= 2_147_483_647 ? kopecks : null;
}
