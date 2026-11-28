const { randomInt } = require('crypto');
const { Injectable, Inject } = require('@nestjs/common');
const { PrismaService } = require('../prisma/prisma.service');
const { apiError } = require('../common/api-error');
const { isUuid } = require('../common/ids');
const { parseDate, parseSort } = require('../common/list-query');
const { pageResult, parseLimit, parsePage } = require('../common/pagination');
const { toOrderPoint } = require('../orders/orders.service');

const QUEUES = { active: ['PAID', 'PRINTING', 'READY'], completed: ['ISSUED', 'CANCELLED'] };
const VISIBLE = [...QUEUES.active, ...QUEUES.completed];

@Injectable()
class PointOrdersService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async list(user, query) {
    const page = parsePage(query && query.page);
    const limit = parseLimit(query && query.limit);
    const status = parseVisibleStatus(query && query.status);
    const createdFrom = parseDate(query && query.createdFrom, 'createdFrom');
    const createdTo = parseDate(query && query.createdTo, 'createdTo');
    const sortOrder = parseSort(query);
    const queue = query?.queue;
    if (queue !== undefined && (typeof queue !== 'string' || !Object.hasOwn(QUEUES, queue))) {
      throw apiError('VALIDATION_ERROR', { details: [{ field: 'queue', message: 'Неизвестная очередь заказов' }] });
    }
    const statuses = queue === undefined ? VISIBLE : QUEUES[queue].filter((item) => !status || item === status);
    const where = {
      printPoint: { ownerId: user.id },
      status: status && queue === undefined ? status : { in: statuses },
    };
    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) where.createdAt.gte = createdFrom;
      if (createdTo) where.createdAt.lte = createdTo;
    }
    if (query && query.printPointId !== undefined && query.printPointId !== '') {
      where.printPointId = await this.ownPointId(user, query.printPointId);
    }
    const [orders, totalItems] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: pointInclude,
        orderBy: { createdAt: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return pageResult(orders.map(toOrderPoint), totalItems, page, limit);
  }

  async getOne(user, orderId) {
    return toOrderPoint(await this.ownOrder(user, orderId));
  }

  async start(user, orderId) {
    const order = await this.ownOrder(user, orderId);
    if (order.status !== 'PAID') throw apiError('INVALID_STATUS_TRANSITION');
    const updated = await transition(this.prisma, { id: order.id, status: 'PAID' }, { status: 'PRINTING' });
    return toOrderPoint(updated);
  }

  async ready(user, orderId) {
    const order = await this.ownOrder(user, orderId);
    if (order.status !== 'PRINTING') throw apiError('INVALID_STATUS_TRANSITION');
    const updated = await this.assignCode(order.id);
    return toOrderPoint(updated);
  }

  async issue(user, orderId, body) {
    const order = await this.ownOrder(user, orderId);
    if (order.status === 'ISSUED') throw apiError('ORDER_ALREADY_ISSUED');
    if (order.status !== 'READY') throw apiError('INVALID_STATUS_TRANSITION');
    const code = body && typeof body.code === 'string' ? body.code.trim() : '';
    if (!/^\d{6}$/.test(code)) {
      throw apiError('VALIDATION_ERROR', { message: 'Код выдачи должен состоять из 6 цифр' });
    }
    if (code !== order.pickupCode) throw apiError('INVALID_PICKUP_CODE');
    const updated = await transition(this.prisma, { id: order.id, status: 'READY', pickupCode: code },
      { status: 'ISSUED' }, 'ORDER_ALREADY_ISSUED');
    return toOrderPoint(updated);
  }

  async cancel(user, orderId, body) {
    const reason = body && typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason || reason.length > 500) {
      throw apiError('VALIDATION_ERROR', {
        details: [{ field: 'reason', message: 'Укажите причину отмены' }],
      });
    }
    const order = await this.ownOrder(user, orderId);
    if (order.status !== 'PAID' && order.status !== 'PRINTING') {
      throw apiError('ORDER_NOT_CANCELLABLE');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const cancelled = await transition(tx, { id: order.id, status: order.status },
        { status: 'CANCELLED', cancelReason: reason }, 'ORDER_NOT_CANCELLABLE');
      if (order.payment) {
        await tx.payment.updateMany({
          where: { id: order.payment.id, status: 'SUCCEEDED' },
          data: { status: 'REFUNDED' },
        });
      }
      return cancelled;
    });
    return toOrderPoint(updated);
  }

  async ownPointId(user, printPointId) {
    if (!isUuid(printPointId)) throw apiError('PRINT_POINT_NOT_FOUND');
    const point = await this.prisma.printPoint.findUnique({ where: { id: printPointId } });
    if (!point) throw apiError('PRINT_POINT_NOT_FOUND');
    if (point.ownerId !== user.id) throw apiError('PRINT_POINT_NOT_OWNER');
    return point.id;
  }

  async ownOrder(user, orderId) {
    if (!isUuid(orderId)) throw apiError('NOT_FOUND');
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: pointInclude,
    });
    if (!order) throw apiError('NOT_FOUND');
    if (!order.printPoint || order.printPoint.ownerId !== user.id) {
      throw apiError('ORDER_NOT_IN_POINT');
    }
    if (order.status === 'CREATED') {
      throw apiError('NOT_FOUND');
    }
    return order;
  }

  async assignCode(orderId) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await transition(this.prisma, { id: orderId, status: 'PRINTING' }, {
          status: 'READY', pickupCode: String(randomInt(0, 1000000)).padStart(6, '0'),
        });
      } catch (error) {
        if (!error || error.code !== 'P2002') throw error;
      }
    }
    throw apiError('INTERNAL_ERROR');
  }
}

const pointInclude = { printPoint: true, document: true, payment: true };

async function transition(db, where, data, conflict = 'INVALID_STATUS_TRANSITION') {
  try {
    return await db.order.update({ where, data, include: pointInclude });
  } catch (error) {
    if (error?.code === 'P2025') throw apiError(conflict);
    throw error;
  }
}

function parseVisibleStatus(value) {
  if (value === undefined || value === null || value === '') return '';
  if (!VISIBLE.includes(value)) {
    throw apiError('VALIDATION_ERROR', {
      details: [{ field: 'status', message: 'Неизвестный статус заказа' }],
    });
  }
  return value;
}

Inject(PrismaService)(PointOrdersService, undefined, 0);

module.exports = { PointOrdersService };
