const { Injectable, Inject } = require('@nestjs/common');
const { PrismaService } = require('../prisma/prisma.service');
const { apiError } = require('../common/api-error');
const { isUuid } = require('../common/ids');
const { pageResult, parseLimit, parsePage, parseSearch } = require('../common/pagination');
const { normalizeCity, isValidCity } = require('../common/user-input');
const { toAdminPoint } = require('../print-points/present');

@Injectable()
class AdminPrintPointsService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async list(query) {
    const page = parsePage(query && query.page);
    const limit = parseLimit(query && query.limit);
    const search = parseSearch(query && query.q);
    const where = {};
    if (query && query.status) {
      if (!['PENDING', 'APPROVED', 'REJECTED'].includes(query.status)) {
        throw apiError('VALIDATION_ERROR', {
          details: [{ field: 'status', message: 'Неизвестный статус точки' }],
        });
      }
      where.status = query.status;
    }
    if (query && query.isActive !== undefined && query.isActive !== '') {
      if (query.isActive !== 'true' && query.isActive !== 'false') {
        throw apiError('VALIDATION_ERROR', {
          details: [{ field: 'isActive', message: 'Укажите true или false' }],
        });
      }
      where.isActive = query.isActive === 'true';
    }
    const city = normalizeCity(query && query.city);
    if (query && query.city) {
      if (!isValidCity(city)) {
        throw apiError('VALIDATION_ERROR', {
          details: [{ field: 'city', message: 'Укажите город' }],
        });
      }
      where.city = { equals: city, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [points, totalItems] = await Promise.all([
      this.prisma.printPoint.findMany({
        where,
        include: { owner: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.printPoint.count({ where }),
    ]);
    return pageResult(points.map(toAdminPoint), totalItems, page, limit);
  }

  async approve(printPointId) {
    const point = await this.find(printPointId);
    if (point.status !== 'PENDING') throw apiError('PRINT_POINT_NOT_PENDING');
    const updated = await this.prisma.printPoint.update({
      where: { id: point.id },
      data: { status: 'APPROVED', isActive: true },
      include: { owner: true },
    });
    return toAdminPoint(updated);
  }

  async reject(printPointId, body) {
    const point = await this.find(printPointId);
    if (point.status !== 'PENDING') throw apiError('PRINT_POINT_NOT_PENDING');
    let reason = null;
    if (body && body.reason !== undefined) {
      reason = typeof body.reason === 'string' ? body.reason.trim() : '';
      if (!reason || reason.length > 500) {
        throw apiError('VALIDATION_ERROR', {
          details: [{ field: 'reason', message: 'Укажите причину отказа' }],
        });
      }
    }
    const updated = await this.prisma.printPoint.update({
      where: { id: point.id },
      data: { status: 'REJECTED', isActive: false, rejectionReason: reason },
      include: { owner: true },
    });
    return toAdminPoint(updated);
  }

  async setActive(printPointId, body) {
    const point = await this.find(printPointId);
    if (typeof (body && body.isActive) !== 'boolean') {
      throw apiError('VALIDATION_ERROR', {
        details: [{ field: 'isActive', message: 'Укажите true или false' }],
      });
    }
    if (point.status !== 'APPROVED') throw apiError('PRINT_POINT_NOT_APPROVED');
    const updated = await this.prisma.printPoint.update({
      where: { id: point.id },
      data: { isActive: body.isActive },
      include: { owner: true },
    });
    return toAdminPoint(updated);
  }

  async find(printPointId) {
    if (!isUuid(printPointId)) throw apiError('NOT_FOUND');
    const point = await this.prisma.printPoint.findUnique({
      where: { id: printPointId },
      include: { owner: true },
    });
    if (!point) throw apiError('NOT_FOUND');
    return point;
  }
}

Inject(PrismaService)(AdminPrintPointsService, undefined, 0);

module.exports = { AdminPrintPointsService };
