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
