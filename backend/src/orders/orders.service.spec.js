const { createHash } = require('crypto');
const { OrdersService } = require('./orders.service');

const QUOTE_ID = '11111111-2222-4333-8444-555555555555';
const POINT_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const DOCUMENT_ID = '6d1f0c3e-8b2a-4f1e-9c0d-112233445566';
const KEY = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const USER = { id: 'user-1', city: 'Калуга' };

function hash(quoteId, printPointId) {
  return createHash('sha256').update(`${quoteId}:${printPointId}`).digest('hex');
}

function quote(overrides = {}) {
  return {
    id: QUOTE_ID,
    userId: USER.id,
    documentId: DOCUMENT_ID,
    city: 'Калуга',
    pageCount: 10,
    colorMode: 'BW',
    copies: 2,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    offers: [{ printPointId: POINT_ID, pricePerPage: 500, total: 10000 }],
    ...overrides,
  };
}

function point(overrides = {}) {
  return {
    id: POINT_ID,
    name: 'Копирка',
    city: 'Калуга',
    address: 'Кирова, 20',
    status: 'APPROVED',
    isActive: true,
    pricePerPageBw: 500,
    pricePerPageColor: 1500,
    commissionBps: 1000,
    ...overrides,
  };
}

describe('OrdersService', () => {
  function createService() {
    const prisma = {
      idempotencyRecord: {
        create: jest.fn().mockResolvedValue({ id: 'idem-1' }),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      },
      quote: { findUnique: jest.fn().mockResolvedValue(quote()) },
      printPoint: { findUnique: jest.fn().mockResolvedValue(point()) },
      order: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            ...data,
            id: 'order-1',
            createdAt: new Date('2026-11-24T12:00:00.000Z'),
            updatedAt: new Date('2026-11-24T12:00:00.000Z'),
            printPoint: point(),
            document: { id: DOCUMENT_ID, originalName: 'a.pdf', pageCount: 10 },
            payment: null,
            pickupCode: null,
          }),
        ),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    prisma.$transaction = (callback) => callback(prisma);
    return { service: new OrdersService(prisma), prisma };
  }

  const request = { quoteId: QUOTE_ID, printPointId: POINT_ID };

  it('snapshots the recomputed price and withholds commission from the total', async () => {
    const { service, prisma } = createService();

    const result = await service.create(USER, request, KEY);

    expect(result.statusCode).toBe(201);
    expect(result.body).toMatchObject({
      status: 'CREATED',
      unitPrice: 500,
      subtotal: 10000,
      commissionBps: 1000,
      commissionAmount: 1000,
      total: 10000,
      currency: 'RUB',
      payment: null,
      pickupCode: null,
    });
    expect(prisma.idempotencyRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED', responseStatus: 201 }),
      }),
    );
  });

  it('rejects an expired quote and releases the idempotency key', async () => {
    const { service, prisma } = createService();
    prisma.quote.findUnique.mockResolvedValue(quote({ expiresAt: new Date(Date.now() - 1000) }));

    await expect(service.create(USER, request, KEY)).rejects.toMatchObject({
      response: { code: 'QUOTE_EXPIRED' },
    });
    expect(prisma.order.create).not.toHaveBeenCalled();
    expect(prisma.idempotencyRecord.delete).toHaveBeenCalledWith({ where: { id: 'idem-1' } });
  });

  it('rejects the order when the profile city changed', async () => {
    const { service } = createService();

    await expect(service.create({ ...USER, city: 'Москва' }, request, KEY)).rejects.toMatchObject({
      response: { code: 'CITY_CHANGED' },
    });
  });

  it('rejects the order when the point is not in the quote', async () => {
    const { service, prisma } = createService();
    prisma.quote.findUnique.mockResolvedValue(quote({ offers: [] }));

    await expect(service.create(USER, request, KEY)).rejects.toMatchObject({
      response: { code: 'QUOTE_POINT_MISMATCH' },
    });
  });

  it('rejects the order when the tariff no longer matches the quote', async () => {
    const { service, prisma } = createService();
    prisma.printPoint.findUnique.mockResolvedValue(point({ pricePerPageBw: 600 }));

    await expect(service.create(USER, request, KEY)).rejects.toMatchObject({
      response: { code: 'PRICE_CHANGED' },
    });
  });

  it('rejects the order when the point was moved to another city', async () => {
    const { service, prisma } = createService();
    prisma.printPoint.findUnique.mockResolvedValue(point({ city: 'Тула' }));

    await expect(service.create(USER, request, KEY)).rejects.toMatchObject({
      response: { code: 'CITY_CHANGED' },
    });
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('returns the stored order for the same key and body', async () => {
    const { service, prisma } = createService();
    prisma.idempotencyRecord.create.mockRejectedValue({ code: 'P2002' });
    prisma.idempotencyRecord.findUnique.mockResolvedValue({
      id: 'idem-1',
      requestHash: hash(QUOTE_ID, POINT_ID),
      status: 'COMPLETED',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      responseBody: { id: 'order-1', status: 'CREATED' },
    });

    await expect(service.create(USER, request, KEY)).resolves.toEqual({
      statusCode: 200,
      body: { id: 'order-1', status: 'CREATED' },
    });
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('rejects the same key while the first request is still running', async () => {
    const { service, prisma } = createService();
    prisma.idempotencyRecord.create.mockRejectedValue({ code: 'P2002' });
    prisma.idempotencyRecord.findUnique.mockResolvedValue({
      requestHash: hash(QUOTE_ID, POINT_ID),
      status: 'IN_PROGRESS',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await expect(service.create(USER, request, KEY)).rejects.toMatchObject({
      response: { code: 'IDEMPOTENCY_IN_PROGRESS' },
    });
  });

  it('rejects the same key when the body is different', async () => {
    const { service, prisma } = createService();
    prisma.idempotencyRecord.create.mockRejectedValue({ code: 'P2002' });
    prisma.idempotencyRecord.findUnique.mockResolvedValue({
      requestHash: 'other',
      status: 'COMPLETED',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    await expect(service.create(USER, request, KEY)).rejects.toMatchObject({
      response: { code: 'IDEMPOTENCY_KEY_MISMATCH' },
    });
  });

  it('hides another client order', async () => {
    const { service, prisma } = createService();
    prisma.order.findUnique.mockResolvedValue({ userId: 'other' });

    await expect(service.getOne(USER, QUOTE_ID)).rejects.toMatchObject({
      response: { code: 'ORDER_NOT_OWNER' },
    });
  });
});
