const { POSTGRES_INT_MAX, calculatePrice, rateFor } = require('./price');

describe('calculatePrice', () => {
  it('multiplies pages, copies and the black-and-white rate', () => {
    expect(
      calculatePrice({ pageCount: 10, copies: 2, unitPrice: 500, commissionBps: 0 }),
    ).toEqual({
      ok: true,
      unitPrice: 500,
      subtotal: 10000,
      commissionBps: 0,
      commissionAmount: 0,
      total: 10000,
      currency: 'RUB',
    });
  });

  it('keeps the client total equal to the print price when commission is withheld', () => {
    expect(
      calculatePrice({ pageCount: 10, copies: 2, unitPrice: 500, commissionBps: 1000 }),
    ).toMatchObject({
      subtotal: 10000,
      commissionAmount: 1000,
      total: 10000,
    });
  });

  it('accepts the largest PostgreSQL INTEGER and rejects one kopeck above it', () => {
    expect(
      calculatePrice({
        pageCount: POSTGRES_INT_MAX,
        copies: 1,
        unitPrice: 1,
        commissionBps: 0,
      }),
    ).toMatchObject({ ok: true, subtotal: POSTGRES_INT_MAX, total: POSTGRES_INT_MAX });

    expect(
      calculatePrice({
        pageCount: POSTGRES_INT_MAX,
        copies: 1,
        unitPrice: 2,
        commissionBps: 0,
      }).ok,
    ).toBe(false);
  });

  it('rejects a commission that does not fit into PostgreSQL INTEGER', () => {
    expect(
      calculatePrice({
        pageCount: 2000000000,
        copies: 1,
        unitPrice: 1,
        commissionBps: 20000,
      }).ok,
    ).toBe(false);
  });

  it('rejects a product that is not a safe integer', () => {
    expect(
      calculatePrice({
        pageCount: Number.MAX_SAFE_INTEGER,
        copies: 2,
        unitPrice: 2,
        commissionBps: 0,
      }).ok,
    ).toBe(false);
  });
});

describe('rateFor', () => {
  const point = { pricePerPageBw: 300, pricePerPageColor: 1500 };

  it('selects the rate of the requested mode', () => {
    expect(rateFor('BW', point)).toBe(300);
    expect(rateFor('COLOR', point)).toBe(1500);
  });
});
