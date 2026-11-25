const { Injectable, Inject } = require('@nestjs/common');
const { PrismaService } = require('../prisma/prisma.service');
const { apiError } = require('../common/api-error');
const { isUuid } = require('../common/ids');
const { normalizeCity } = require('../common/user-input');
const { calculatePrice, rateFor } = require('../pricing/price');

const QUOTE_TTL_MS = 15 * 60 * 1000;

@Injectable()
class QuotesService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(user, body) {
    const documentId = body && body.documentId;
    const colorMode = body && body.colorMode;
    const copies = body && body.copies;
    const details = quoteDetails(documentId, colorMode, copies);
    if (details.length > 0) {
      throw apiError('VALIDATION_ERROR', { details });
    }

    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) {
      throw apiError('NOT_FOUND');
    }
    if (document.userId !== user.id) {
      throw apiError('DOCUMENT_NOT_OWNER');
    }

    const city = normalizeCity(user.city);
    const rateField = colorMode === 'COLOR' ? 'pricePerPageColor' : 'pricePerPageBw';
    const points = await this.prisma.printPoint.findMany({
      where: {
        status: 'APPROVED',
        isActive: true,
        city: { equals: city, mode: 'insensitive' },
        [rateField]: { gt: 0 },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    const offers = points.map((point) => {
      const price = calculatePrice({
        pageCount: document.pageCount,
        copies,
        unitPrice: rateFor(colorMode, point),
        commissionBps: point.commissionBps,
      });
      if (!price.ok) {
        throw apiError('VALIDATION_ERROR', {
          details: [{ field: 'copies', message: 'Сумма слишком большая' }],
        });
      }
      return {
        printPointId: point.id,
        pricePerPage: price.unitPrice,
        total: price.total,
      };
    });

    const quote = await this.prisma.quote.create({
      data: {
        userId: user.id,
        documentId: document.id,
        city,
        pageCount: document.pageCount,
        colorMode,
        copies,
        expiresAt: new Date(Date.now() + QUOTE_TTL_MS),
        offers: { create: offers },
      },
      include: { offers: { include: { printPoint: true } } },
    });

    return toQuote(quote);
  }
}

function quoteDetails(documentId, colorMode, copies) {
  const details = [];
  if (!isUuid(documentId)) {
    details.push({ field: 'documentId', message: 'Укажите документ' });
  }
  if (colorMode !== 'BW' && colorMode !== 'COLOR') {
    details.push({ field: 'colorMode', message: 'Выберите чёрно-белый или цветной режим' });
  }
  if (!Number.isInteger(copies) || copies < 1 || copies > 100) {
    details.push({ field: 'copies', message: 'Укажите число от 1 до 100' });
  }
  return details;
}

function toQuote(quote) {
  const offers = [...quote.offers].sort((left, right) => {
    const byName = left.printPoint.name.localeCompare(right.printPoint.name, 'ru');
    if (byName !== 0) {
      return byName;
    }
    return left.printPointId.localeCompare(right.printPointId);
  });

  return {
    id: quote.id,
    expiresAt: quote.expiresAt.toISOString(),
    city: quote.city,
    documentId: quote.documentId,
    pageCount: quote.pageCount,
    colorMode: quote.colorMode,
    copies: quote.copies,
    offers: offers.map((offer) => ({
      printPointId: offer.printPointId,
      name: offer.printPoint.name,
      city: offer.printPoint.city,
      address: offer.printPoint.address,
      workingHours: offer.printPoint.workingHours,
      pricePerPage: offer.pricePerPage,
      total: offer.total,
    })),
  };
}

Inject(PrismaService)(QuotesService, undefined, 0);

module.exports = { QuotesService, QUOTE_TTL_MS };
