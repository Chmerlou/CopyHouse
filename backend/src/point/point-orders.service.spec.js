const { PointOrdersService } = require('./point-orders.service');

const ORDER = {
  id: '11111111-1111-4111-8111-111111111201',
  status: 'PAID',
  createdAt: new Date('2026-11-26T10:00:00.000Z'),
  updatedAt: new Date('2026-11-26T10:00:00.000Z'),
  printPoint: { id: 'point-1', name: 'Лист', city: 'Калуга', address: 'Кирова, 20' },
  document: { id: 'doc-1', originalName: 'a.pdf', pageCount: 2 },
  colorMode: 'BW',
  copies: 1,
  pageCount: 2,
  unitPrice: 500,
  subtotal: 1000,
  commissionBps: 0,
  commissionAmount: 0,
  total: 1000,
  currency: 'RUB',
  payment: null,
  pickupCode: null,
};

describe('PointOrdersService list', () => {
  function createService() {
    const prisma = {
      order: {
        findMany: jest.fn().mockResolvedValue([ORDER]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    return { service: new PointOrdersService(prisma), prisma };
  }

  it('hides unpaid orders and sorts new ones first', async () => {
    const { service, prisma } = createService();

    const page = await service.list({ id: 'owner-1' }, {});

    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        printPoint: { ownerId: 'owner-1' },
        status: { in: ['PAID', 'PRINTING', 'READY', 'ISSUED', 'CANCELLED'] },
      },
      orderBy: { createdAt: 'desc' },
    }));
    expect(page.items[0].pickupCode).toBeUndefined();
  });

  it('applies the date range and ascending sort', async () => {
    const { service, prisma } = createService();

    await service.list({ id: 'owner-1' }, {
      createdFrom: '2026-11-01T00:00:00.000Z',
      createdTo: '2026-11-30T23:59:59.000Z',
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });

    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        createdAt: {
          gte: new Date('2026-11-01T00:00:00.000Z'),
          lte: new Date('2026-11-30T23:59:59.000Z'),
        },
      }),
      orderBy: { createdAt: 'asc' },
    }));
  });

  it('rejects an unknown sort field before reading orders', async () => {
    const { service, prisma } = createService();

    await expect(service.list({ id: 'owner-1' }, { sortBy: 'total' })).rejects.toMatchObject({
      response: { code: 'VALIDATION_ERROR', statusCode: 400 },
    });
    expect(prisma.order.findMany).not.toHaveBeenCalled();
  });
});

const ORDER_ID = '11111111-2222-4333-8444-555555555555';
const USER = { id: 'provider' };

describe('PointOrdersService queue and transitions', () => {
  it.each([
    ['active', ['PAID', 'PRINTING', 'READY']],
    ['completed', ['ISSUED', 'CANCELLED']],
  ])('filters the %s queue before paginating or counting it', async (queue, statuses) => {
    const prisma = { order: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) } };

    await new PointOrdersService(prisma).list(USER, { queue, page: '2' });

    const where = { printPoint: { ownerId: USER.id }, status: { in: statuses } };
    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where, skip: 20, take: 20 }));
    expect(prisma.order.count).toHaveBeenCalledWith({ where });
  });

  it('combines queue, date range and ascending order for the provider view', async () => {
    const prisma = { order: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) } };
    await new PointOrdersService(prisma).list(USER, {
      queue: 'active', createdFrom: '2026-11-01T00:00:00.000Z',
      createdTo: '2026-11-30T23:59:59.000Z', sortBy: 'createdAt', sortOrder: 'asc',
    });
    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: { in: ['PAID', 'PRINTING', 'READY'] },
        createdAt: {
          gte: new Date('2026-11-01T00:00:00.000Z'),
          lte: new Date('2026-11-30T23:59:59.000Z'),
        },
      }),
      orderBy: { createdAt: 'asc' },
    }));
  });

  it('rejects an unpaid status and an unknown sort field before reading orders', async () => {
    const prisma = { order: { findMany: jest.fn(), count: jest.fn() } };
    const service = new PointOrdersService(prisma);
    await expect(service.list(USER, { status: 'CREATED' })).rejects.toMatchObject({
      response: { code: 'VALIDATION_ERROR', statusCode: 400 },
    });
    await expect(service.list(USER, { sortBy: 'total' })).rejects.toMatchObject({
      response: { code: 'VALIDATION_ERROR', statusCode: 400 },
    });
    expect(prisma.order.findMany).not.toHaveBeenCalled();
  });

  it('does not expose an unpaid order to the print provider', async () => {
    const prisma = { order: { findUnique: jest.fn().mockResolvedValue({
      id: ORDER_ID, status: 'CREATED', printPoint: { ownerId: USER.id },
    }) } };
    await expect(new PointOrdersService(prisma).getOne(USER, ORDER_ID)).rejects.toMatchObject({
      response: { code: 'NOT_FOUND', statusCode: 404 },
    });
  });

  it.each([
    ['start', 'PAID', {}, 'PRINTING', 'INVALID_STATUS_TRANSITION'],
    ['ready', 'PRINTING', {}, 'READY', 'INVALID_STATUS_TRANSITION'],
    ['issue', 'READY', { code: '012345' }, 'ISSUED', 'ORDER_ALREADY_ISSUED'],
    ['cancel', 'PAID', { reason: 'Точка закрыта' }, 'CANCELLED', 'ORDER_NOT_CANCELLABLE'],
  ])('applies %s once when both operators read the same status', async (action, status, body, nextStatus, code) => {
    let saved = {
      id: ORDER_ID,
      status,
      pickupCode: status === 'READY' ? '012345' : null,
      createdAt: new Date(),
      updatedAt: new Date(),
      printPoint: { id: 'point', ownerId: USER.id },
      document: { id: 'document' },
      payment: { id: 'payment', status: 'SUCCEEDED' },
    };
    const prisma = {
      order: {
        findUnique: jest.fn(async () => ({ ...saved })),
        update: jest.fn(async ({ where, data }) => {
          if (where.status && where.status !== saved.status) {
            throw Object.assign(new Error('Record no longer matches'), { code: 'P2025' });
          }
          saved = { ...saved, ...data };
          return saved;
        }),
      },
      payment: { update: jest.fn(), updateMany: jest.fn() },
    };
    prisma.$transaction = (callback) => callback(prisma);
    const service = new PointOrdersService(prisma);

    const results = await Promise.allSettled([
      service[action](USER, ORDER_ID, body),
      service[action](USER, ORDER_ID, body),
    ]);

    expect(results).toEqual([
      { status: 'fulfilled', value: expect.objectContaining({ status: nextStatus }) },
      { status: 'rejected', reason: expect.objectContaining({
        response: expect.objectContaining({ statusCode: 409, code }),
      }) },
    ]);
    expect(saved.status).toBe(nextStatus);
    if (action === 'ready') expect(saved.pickupCode).toMatch(/^\d{6}$/);
    if (action === 'cancel') expect(prisma.payment.updateMany).toHaveBeenCalledTimes(1);
  });
});
