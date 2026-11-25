const { createHash } = require('crypto');
const { Injectable, Inject } = require('@nestjs/common');
const { PrismaService } = require('../prisma/prisma.service');
const { apiError } = require('../common/api-error');
const { isUuid } = require('../common/ids');
const { pageResult, parseLimit, parsePage } = require('../common/pagination');
const { normalizeCity } = require('../common/user-input');
const { calculatePrice, rateFor } = require('../pricing/price');

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const ORDER_STATUSES = new Set(['CREATED', 'PAID', 'PRINTING', 'READY', 'ISSUED', 'CANCELLED']);

@Injectable()
class OrdersService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(user, body, idempotencyKey) {
    const quoteId = body && body.quoteId;
    const printPointId = body && body.printPointId;
    const details = orderDetails(quoteId, printPointId, idempotencyKey);
    if (details.length > 0) {
      throw apiError('VALIDATION_ERROR', { details });
    }

    const claim = await this.claimIdempotency(user.id, idempotencyKey.trim(), requestHash(quoteId, printPointId));
    if (claim.replay) {
      return { statusCode: 200, body: claim.body };
    }

    try {
      const responseBody = await this.prisma.$transaction((tx) =>
        this.placeOrder(tx, user, quoteId, printPointId, claim.id),
      );
      return { statusCode: 201, body: responseBody };
    } catch (error) {
      await Promise.resolve(
        this.prisma.idempotencyRecord.delete({ where: { id: claim.id } }),
      ).catch(() => {});
      throw error;
    }
  }

  async list(user, query) {
    const page = parsePage(query && query.page);
    const limit = parseLimit(query && query.limit);
    const where = { userId: user.id };
    const status = parseStatus(query && query.status);
    const createdFrom = parseDate(query && query.createdFrom, 'createdFrom');
    const createdTo = parseDate(query && query.createdTo, 'createdTo');
    if (query && query.sortBy !== undefined && query.sortBy !== '' && query.sortBy !== 'createdAt') {
      throw apiError('VALIDATION_ERROR', {
        details: [{ field: 'sortBy', message: 'Сортировка доступна только по дате создания' }],
      });
    }

    if (status) {
      where.status = status;
    }
    if (createdFrom || createdTo) {
      where.createdAt = {};
      if (createdFrom) {
        where.createdAt.gte = createdFrom;
      }
      if (createdTo) {
        where.createdAt.lte = createdTo;
      }
    }

    const [orders, totalItems] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: parseSortOrder(query && query.sortOrder) },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return pageResult(orders.map(toOrderClient), totalItems, page, limit);
  }

  async getOne(user, orderId) {
    if (!isUuid(orderId)) {
      throw apiError('NOT_FOUND');
    }
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });
    if (!order) {
      throw apiError('NOT_FOUND');
    }
    if (order.userId !== user.id) {
      throw apiError('ORDER_NOT_OWNER');
    }
    return toOrderClient(order);
  }

  async pay(user, orderId, body) {
    const outcome = body && body.outcome;
    if (outcome !== 'SUCCESS' && outcome !== 'FAILURE') {
      throw apiError('VALIDATION_ERROR', {
        details: [{ field: 'outcome', message: 'Укажите SUCCESS или FAILURE' }],
      });
    }
    await this.findOwnOrder(user, orderId);
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: orderId }, include: orderInclude });
      if (current.payment && current.payment.status === 'SUCCEEDED') {
        if (outcome === 'SUCCESS') return toOrderClient(current);
        throw apiError('PAYMENT_ALREADY_SUCCEEDED');
      }
      if (current.status !== 'CREATED') {
        throw apiError('ORDER_NOT_PAYABLE');
      }

      const payment = current.payment
        ? await tx.payment.update({
            where: { id: current.payment.id },
            data: { status: 'PENDING', amount: current.total, provider: 'MOCK' },
          })
        : await tx.payment.create({
            data: { orderId: current.id, status: 'PENDING', amount: current.total, provider: 'MOCK' },
          });
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: outcome === 'SUCCESS' ? 'SUCCEEDED' : 'FAILED' },
      });
      const updated = outcome === 'SUCCESS'
        ? await tx.order.update({
            where: { id: current.id },
            data: { status: 'PAID' },
            include: orderInclude,
          })
        : await tx.order.findUnique({ where: { id: current.id }, include: orderInclude });
      return toOrderClient(updated);
    });
  }

  async cancel(user, orderId) {
    const order = await this.findOwnOrder(user, orderId);
    if (order.status !== 'CREATED' || (order.payment && order.payment.status === 'SUCCEEDED')) {
      throw apiError('ORDER_NOT_CANCELLABLE');
    }
    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
      include: orderInclude,
    });
    return toOrderClient(updated);
  }

  async findOwnOrder(user, orderId) {
    if (!isUuid(orderId)) {
      throw apiError('NOT_FOUND');
    }
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });
    if (!order) {
      throw apiError('NOT_FOUND');
    }
    if (order.userId !== user.id) {
      throw apiError('ORDER_NOT_OWNER');
    }
    return order;
  }

  async claimIdempotency(userId, key, hash, attempt = 0) {
    if (attempt > 3) {
      throw apiError('IDEMPOTENCY_IN_PROGRESS');
    }

    const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);
    try {
      const created = await this.prisma.idempotencyRecord.create({
        data: { userId, key, requestHash: hash, status: 'IN_PROGRESS', expiresAt },
      });
      return { replay: false, id: created.id };
    } catch (error) {
      if (!error || error.code !== 'P2002') {
        throw error;
      }
    }

    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: { userId_key: { userId, key } },
    });
    if (!existing) {
      return this.claimIdempotency(userId, key, hash, attempt + 1);
    }
    if (existing.expiresAt.getTime() <= Date.now()) {
      const replaced = await this.prisma.idempotencyRecord.updateMany({
        where: { id: existing.id, expiresAt: existing.expiresAt },
        data: {
          requestHash: hash,
          status: 'IN_PROGRESS',
          responseStatus: null,
          responseBody: null,
          orderId: null,
          expiresAt,
        },
      });
      if (replaced.count === 0) {
        return this.claimIdempotency(userId, key, hash, attempt + 1);
      }
      return { replay: false, id: existing.id };
    }
    if (existing.requestHash !== hash) {
      throw apiError('IDEMPOTENCY_KEY_MISMATCH');
    }
    if (existing.status === 'COMPLETED') {
      return { replay: true, body: existing.responseBody };
    }
    throw apiError('IDEMPOTENCY_IN_PROGRESS');
  }

  async placeOrder(tx, user, quoteId, printPointId, idempotencyId) {
    const quote = await tx.quote.findUnique({
      where: { id: quoteId },
      include: { offers: true },
    });
    if (!quote) {
      throw apiError('QUOTE_NOT_FOUND');
    }
    if (quote.userId !== user.id) {
      throw apiError('QUOTE_NOT_OWNER');
    }
    if (quote.expiresAt.getTime() <= Date.now()) {
      throw apiError('QUOTE_EXPIRED');
    }
    if (normalizeCity(user.city).toLowerCase() !== normalizeCity(quote.city).toLowerCase()) {
      throw apiError('CITY_CHANGED');
    }

    const offer = quote.offers.find((item) => item.printPointId === printPointId);
    if (!offer) {
      throw apiError('QUOTE_POINT_MISMATCH');
    }

    const point = await tx.printPoint.findUnique({ where: { id: printPointId } });
    if (!point) {
      throw apiError('PRINT_POINT_NOT_FOUND');
    }
    if (normalizeCity(point.city).toLowerCase() !== normalizeCity(quote.city).toLowerCase()) {
      throw apiError('CITY_CHANGED');
    }
    if (point.status !== 'APPROVED') {
      throw apiError('PRINT_POINT_NOT_APPROVED');
    }
    if (!point.isActive) {
      throw apiError('PRINT_POINT_INACTIVE');
    }

    const unitPrice = rateFor(quote.colorMode, point);
    if (!Number.isInteger(unitPrice) || unitPrice <= 0) {
      throw apiError('TARIFF_MISSING');
    }

    const price = calculatePrice({
      pageCount: quote.pageCount,
      copies: quote.copies,
      unitPrice,
      commissionBps: point.commissionBps,
    });
    if (!price.ok) {
      throw apiError('VALIDATION_ERROR', {
        details: [{ field: 'quoteId', message: 'Сумма слишком большая' }],
      });
    }
    if (price.unitPrice !== offer.pricePerPage || price.total !== offer.total) {
      throw apiError('PRICE_CHANGED');
    }

    const order = await tx.order.create({
      data: {
        userId: user.id,
        printPointId: point.id,
        documentId: quote.documentId,
        colorMode: quote.colorMode,
        copies: quote.copies,
        pageCount: quote.pageCount,
        unitPrice: price.unitPrice,
        subtotal: price.subtotal,
        commissionBps: price.commissionBps,
        commissionAmount: price.commissionAmount,
        total: price.total,
        currency: 'RUB',
        status: 'CREATED',
      },
      include: orderInclude,
    });

    const responseBody = toOrderClient(order);
    await tx.idempotencyRecord.update({
      where: { id: idempotencyId },
      data: {
        status: 'COMPLETED',
        responseStatus: 201,
        responseBody,
        orderId: order.id,
      },
    });
    return responseBody;
  }
}

const orderInclude = { printPoint: true, document: true, payment: true };

function orderDetails(quoteId, printPointId, idempotencyKey) {
  const details = [];
  if (!isUuid(quoteId)) {
    details.push({ field: 'quoteId', message: 'Укажите расчёт' });
  }
  if (!isUuid(printPointId)) {
    details.push({ field: 'printPointId', message: 'Укажите точку' });
  }
  if (!isUuid(typeof idempotencyKey === 'string' ? idempotencyKey.trim() : '')) {
    details.push({ field: 'Idempotency-Key', message: 'Передайте UUID в заголовке Idempotency-Key' });
  }
  return details;
}

function requestHash(quoteId, printPointId) {
  return createHash('sha256').update(`${quoteId}:${printPointId}`).digest('hex');
}

function parseStatus(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  if (typeof value !== 'string' || !ORDER_STATUSES.has(value)) {
    throw apiError('VALIDATION_ERROR', {
      details: [{ field: 'status', message: 'Неизвестный статус заказа' }],
    });
  }
  return value;
}

function parseDate(value, field) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw apiError('VALIDATION_ERROR', {
      details: [{ field, message: 'Укажите дату и время' }],
    });
  }
  return new Date(value);
}

function parseSortOrder(value) {
  if (value === undefined || value === null || value === '' || value === 'desc') {
    return 'desc';
  }
  if (value === 'asc') {
    return 'asc';
  }
  throw apiError('VALIDATION_ERROR', {
    details: [{ field: 'sortOrder', message: 'Порядок сортировки: asc или desc' }],
  });
}

function toOrderClient(order) {
  const showCode = order.status === 'READY' || order.status === 'ISSUED';
  return {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    printPoint: {
      id: order.printPoint.id,
      name: order.printPoint.name,
      city: order.printPoint.city,
      address: order.printPoint.address,
    },
    document: {
      id: order.document.id,
      originalName: order.document.originalName,
      pageCount: order.document.pageCount,
    },
    colorMode: order.colorMode,
    copies: order.copies,
    pageCount: order.pageCount,
    unitPrice: order.unitPrice,
    subtotal: order.subtotal,
    commissionBps: order.commissionBps,
    commissionAmount: order.commissionAmount,
    total: order.total,
    currency: order.currency,
    payment: order.payment
      ? { status: order.payment.status, amount: order.payment.amount }
      : null,
    pickupCode: showCode ? order.pickupCode : null,
  };
}

function toOrderPoint(order) {
  const view = toOrderClient(order);
  delete view.updatedAt;
  delete view.payment;
  delete view.pickupCode;
  return view;
}

Inject(PrismaService)(OrdersService, undefined, 0);

module.exports = { OrdersService, toOrderClient, toOrderPoint };
