const { QuotesService } = require('./quotes.service');

const DOCUMENT_ID = '6d1f0c3e-8b2a-4f1e-9c0d-112233445566';
const POINT_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

const POINT = {
  id: POINT_ID,
  name: 'Копирка',
  city: 'Калуга',
  address: 'Кирова, 20',
  workingHours: '09:00–21:00',
  pricePerPageBw: 500,
  pricePerPageColor: 1500,
  commissionBps: 0,
};

describe('QuotesService', () => {
  function createService() {
    const prisma = {
      document: { findUnique: jest.fn() },
      printPoint: { findMany: jest.fn().mockResolvedValue([POINT]) },
      quote: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: '11111111-2222-4333-8444-555555555555',
            expiresAt: new Date('2026-11-24T12:15:00.000Z'),
            city: data.city,
            documentId: data.documentId,
            pageCount: data.pageCount,
            colorMode: data.colorMode,
            copies: data.copies,
            offers: data.offers.create.map((offer) => ({ ...offer, printPoint: POINT })),
          }),
        ),
      },
    };
    return { service: new QuotesService(prisma), prisma };
  }

  it('rejects a bad copy count before reading the database', async () => {
    const { service, prisma } = createService();

    await expect(
      service.create({ id: 'user-1', city: 'Калуга' }, {
        documentId: DOCUMENT_ID,
        colorMode: 'BW',
        copies: 0,
      }),
    ).rejects.toMatchObject({ response: { code: 'VALIDATION_ERROR' } });
    expect(prisma.document.findUnique).not.toHaveBeenCalled();
  });

  it('does not price another client document', async () => {
    const { service, prisma } = createService();
    prisma.document.findUnique.mockResolvedValue({
      id: DOCUMENT_ID,
      userId: 'other',
      pageCount: 10,
    });

    await expect(
      service.create({ id: 'user-1', city: 'Калуга' }, {
        documentId: DOCUMENT_ID,
        colorMode: 'BW',
        copies: 2,
      }),
    ).rejects.toMatchObject({ response: { code: 'DOCUMENT_NOT_OWNER' } });
    expect(prisma.quote.create).not.toHaveBeenCalled();
  });

  it('stores a 15-minute quote with page × copies × rate', async () => {
    const { service, prisma } = createService();
    prisma.document.findUnique.mockResolvedValue({
      id: DOCUMENT_ID,
      userId: 'user-1',
      pageCount: 10,
    });

    const quote = await service.create(
      { id: 'user-1', city: ' Калуга ' },
      { documentId: DOCUMENT_ID, colorMode: 'BW', copies: 2 },
    );

    expect(prisma.printPoint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'APPROVED',
          isActive: true,
          city: { equals: 'Калуга', mode: 'insensitive' },
          pricePerPageBw: { gt: 0 },
        }),
      }),
    );
    expect(quote.offers).toEqual([
      expect.objectContaining({ printPointId: POINT_ID, pricePerPage: 500, total: 10000 }),
    ]);
    expect(quote.city).toBe('Калуга');
    expect(quote.pageCount).toBe(10);
  });
});
