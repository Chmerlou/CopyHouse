const { Injectable, Inject } = require('@nestjs/common');
const { PrismaService } = require('../prisma/prisma.service');
const { apiError } = require('../common/api-error');
const { isUuid } = require('../common/ids');
const { pageResult, parseLimit, parsePage, parseSearch } = require('../common/pagination');
const { isValidCity, normalizeCity } = require('../common/user-input');
const { toOwnerPoint } = require('./present');

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
      ...(city === null ? {} : { city: { equals: city, mode: 'insensitive' } }),
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

  async create(user, body) {
    const fields = readPointWrite(body, true);
    const point = await this.prisma.printPoint.create({
      data: {
        ownerId: user.id,
        ...fields,
        commissionBps: 0,
        status: 'PENDING',
        isActive: false,
      },
    });
    return toOwnerPoint(point);
  }

  async listMine(user, query) {
    const page = parsePage(query && query.page);
    const limit = parseLimit(query && query.limit);
    const where = { ownerId: user.id };
    const [points, totalItems] = await Promise.all([
      this.prisma.printPoint.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.printPoint.count({ where }),
    ]);
    return pageResult(points.map(toOwnerPoint), totalItems, page, limit);
  }

  async getMine(user, printPointId) {
    return toOwnerPoint(await this.ownPoint(user, printPointId));
  }

  async updateMine(user, printPointId, body) {
    const point = await this.ownPoint(user, printPointId);
    if (point.status === 'APPROVED') {
      throw apiError('PRINT_POINT_ALREADY_APPROVED');
    }
    const fields = readPointWrite(body, false);
    const updated = await this.prisma.printPoint.update({
      where: { id: point.id },
      data: {
        ...fields,
        status: 'PENDING',
        isActive: false,
        rejectionReason: null,
      },
    });
    return toOwnerPoint(updated);
  }

  async updatePrices(user, printPointId, body) {
    const point = await this.ownPoint(user, printPointId);
    const prices = readPrices(body);
    if (prices.details) {
      throw apiError('VALIDATION_ERROR', { details: prices.details });
    }
    const updated = await this.prisma.printPoint.update({
      where: { id: point.id },
      data: {
        ...prices,
        status: point.status === 'REJECTED' ? 'PENDING' : point.status,
        rejectionReason: point.status === 'REJECTED' ? null : point.rejectionReason,
      },
    });
    return toOwnerPoint(updated);
  }

  async ownPoint(user, printPointId) {
    if (!isUuid(printPointId)) {
      throw apiError('PRINT_POINT_NOT_FOUND');
    }
    const point = await this.prisma.printPoint.findUnique({ where: { id: printPointId } });
    if (!point) {
      throw apiError('PRINT_POINT_NOT_FOUND');
    }
    if (point.ownerId !== user.id) {
      throw apiError('PRINT_POINT_NOT_OWNER');
    }
    return point;
  }
}

function catalogCity(user, query) {
  if (user) {
    return normalizeCity(user.city);
  }
  if (query?.city === undefined) return null;
  const city = normalizeCity(query.city);
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

function readPointWrite(body, pricesRequired) {
  const name = readText(body && body.name, 200);
  const city = normalizeCity(body && body.city);
  const address = readText(body && body.address, 500);
  const workingHours = readText(body && body.workingHours, 200);
  const details = [];
  if (!name) details.push({ field: 'name', message: 'Укажите название' });
  if (!isValidCity(city)) details.push({ field: 'city', message: 'Укажите город' });
  if (!address) details.push({ field: 'address', message: 'Укажите адрес' });
  if (!workingHours) details.push({ field: 'workingHours', message: 'Укажите часы работы' });
  const prices = readPrices(body, !pricesRequired);
  if (pricesRequired && prices.details) details.push(...prices.details);
  if (!pricesRequired && body && (body.pricePerPageBw !== undefined || body.pricePerPageColor !== undefined) && prices.details) {
    details.push(...prices.details);
  }
  if (details.length > 0) {
    throw apiError('VALIDATION_ERROR', { details });
  }
  const data = { name, city, address, workingHours };
  if (!prices.details && prices.pricePerPageBw !== undefined) {
    data.pricePerPageBw = prices.pricePerPageBw;
    data.pricePerPageColor = prices.pricePerPageColor;
  }
  return data;
}

function readPrices(body, optional = false) {
  const bw = body && body.pricePerPageBw;
  const color = body && body.pricePerPageColor;
  if (optional && bw === undefined && color === undefined) {
    return {};
  }
  const details = [];
  if (!Number.isInteger(bw) || bw < 1) {
    details.push({ field: 'pricePerPageBw', message: 'Укажите цену чёрно-белой страницы' });
  }
  if (!Number.isInteger(color) || color < 1) {
    details.push({ field: 'pricePerPageColor', message: 'Укажите цену цветной страницы' });
  }
  if (details.length > 0) {
    return { details };
  }
  return { pricePerPageBw: bw, pricePerPageColor: color };
}

function readText(value, max) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (!text || text.length > max) return '';
  return text;
}

Inject(PrismaService)(PrintPointsService, undefined, 0);

module.exports = { PrintPointsService };
