const { PrintPointsService } = require('./print-points.service');

const POINT = {
  id: 'point-1',
  name: 'Копирка',
  city: 'Калуга',
  address: 'Ленина, 1',
  workingHours: '09:00–21:00',
  pricePerPageBw: 300,
  pricePerPageColor: 1500,
  status: 'APPROVED',
  isActive: true,
  commissionBps: 0,
  ownerId: 'owner-1',
};

describe('PrintPointsService catalog', () => {
  function createService() {
    const prisma = {
      printPoint: {
        findMany: jest.fn().mockResolvedValue([POINT]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    return { service: new PrintPointsService(prisma), prisma };
  }

  it('lists approved public points across cities when a guest supplies no filter', async () => {
    const { service, prisma } = createService();

    await expect(service.listCatalog(null, {})).resolves.toMatchObject({ items: [{ id: POINT.id }] });
    expect(prisma.printPoint.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      status: 'APPROVED', isActive: true, pricePerPageBw: { gt: 0 }, pricePerPageColor: { gt: 0 },
    } }));
  });

  it('returns public prices for a guest city and hides moderation fields', async () => {
    const { service, prisma } = createService();

    await expect(service.listCatalog(null, { city: ' калуга ' })).resolves.toEqual({
      items: [
        {
          id: 'point-1',
          name: 'Копирка',
          city: 'Калуга',
          address: 'Ленина, 1',
          workingHours: '09:00–21:00',
          pricePerPageBw: 300,
          pricePerPageColor: 1500,
        },
      ],
      pagination: { page: 1, limit: 20, totalItems: 1, totalPages: 1 },
    });

    expect(prisma.printPoint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'APPROVED',
          isActive: true,
          pricePerPageBw: { gt: 0 },
          pricePerPageColor: { gt: 0 },
          city: { equals: 'калуга', mode: 'insensitive' },
        }),
      }),
    );
  });

  it('uses the profile city and ignores the query when the caller is signed in', async () => {
    const { service, prisma } = createService();

    await service.listCatalog({ city: 'Калуга' }, { city: 'Москва' });

    expect(prisma.printPoint.findMany.mock.calls[0][0].where.city).toEqual({
      equals: 'Калуга',
      mode: 'insensitive',
    });
  });
});
