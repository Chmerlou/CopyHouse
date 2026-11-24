const { Injectable, Inject } = require('@nestjs/common');
const { PrismaService } = require('../prisma/prisma.service');
const { apiError } = require('../common/api-error');
const { isValidCity, normalizeCity } = require('../common/user-input');
const { pageResult, parseLimit, parsePage, parseSearch } = require('../common/pagination');

@Injectable()
class PrintPointsService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async listCatalog(user, query) {
    const page = parsePage(query && query.page);
    const limit = parseLimit(query && query.limit);
    const search = parseSearch(query && query.q);
    const city = catalogCity(user, query);

    const where = {
      status: 'APPROVED',
      isActive: true,
      pricePerPageBw: { gt: 0 },
      pricePerPageColor: { gt: 0 },
      city: { equals: city, mode: 'insensitive' },
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [points, totalItems] = await Promise.all([
      this.prisma.printPoint.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.printPoint.count({ where }),
    ]);

    return pageResult(points.map(toPublicPoint), totalItems, page, limit);
  }
}

function catalogCity(user, query) {
  if (user) {
    return normalizeCity(user.city);
  }
  const city = normalizeCity(query && query.city);
  if (!isValidCity(city)) {
    throw apiError('VALIDATION_ERROR', {
      details: [{ field: 'city', message: 'Укажите город' }],
    });
  }
  return city;
}

function toPublicPoint(point) {
  return {
    id: point.id,
    name: point.name,
    city: point.city,
    address: point.address,
    workingHours: point.workingHours,
    pricePerPageBw: point.pricePerPageBw,
    pricePerPageColor: point.pricePerPageColor,
  };
}

Inject(PrismaService)(PrintPointsService, undefined, 0);

module.exports = { PrintPointsService };
