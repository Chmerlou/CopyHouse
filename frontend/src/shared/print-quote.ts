import type { ApiSchema } from "./api/contract";
import { savePrintSettings, type PrintOptions } from "./order-draft";

type Quote = ApiSchema<"Quote">;
type QuoteOffer = ApiSchema<"QuoteOffer">;

export class PointRequestError extends Error {
  constructor(message: string, readonly signIn = false) {
    super(message);
  }
}

export async function requestQuote(input: PrintOptions, signal?: AbortSignal): Promise<Quote> {
  const response = await fetch("/api/quotes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  if (response.status === 401) throw new PointRequestError("Войдите в аккаунт снова, чтобы получить цены.", true);
  if (!response.ok) throw new PointRequestError("Попробуйте рассчитать стоимость ещё раз.");
  return response.json();
}

export function quoteMatchesOptions(quote: Quote, options: PrintOptions) {
  return quote.documentId === options.documentId && quote.colorMode === options.colorMode && quote.copies === options.copies;
}

export function saveQuotedPoint(quote: Quote, offer: QuoteOffer) {
  savePrintSettings({
    documentId: quote.documentId,
    colorMode: quote.colorMode,
    copies: quote.copies,
    quoteId: quote.id,
    printPointId: offer.printPointId,
    printPointName: offer.name,
    printPointAddress: offer.address,
    pricePerPage: offer.pricePerPage,
    total: offer.total,
    expiresAt: quote.expiresAt,
  });
}
