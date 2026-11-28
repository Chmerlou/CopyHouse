const { Controller, Get, HttpCode, Post, UseGuards, Inject, Body, Headers: RequestHeader, Param, Query, Req, Res } = require('@nestjs/common');
const { JwtAuthGuard } = require('../auth/jwt-auth.guard');
const { RolesGuard } = require('../auth/roles.guard');
const { Roles } = require('../auth/roles.decorator');
const { OrdersService } = require('./orders.service');

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
class OrdersController {
  constructor(orders) {
    this.orders = orders;
  }

  @Post()
  @Roles('CLIENT')
  async create(request, body, idempotencyKey, response) {
    const result = await this.orders.create(request.user, body || {}, idempotencyKey);
    response.status(result.statusCode);
    return result.body;
  }

  @Get()
  @Roles('CLIENT')
  list(request, query) {
    return this.orders.list(request.user, query || {});
  }

  @Get(':orderId')
  @Roles('CLIENT')
  getOne(request, orderId) {
    return this.orders.getOne(request.user, orderId);
  }

  @Post(':orderId/pay')
  @HttpCode(200)
  @Roles('CLIENT')
  pay(request, orderId, body) {
    return this.orders.pay(request.user, orderId, body || {});
  }

  @Post(':orderId/cancel')
  @HttpCode(200)
  @Roles('CLIENT')
  cancel(request, orderId) {
    return this.orders.cancel(request.user, orderId);
  }
}

Inject(OrdersService)(OrdersController, undefined, 0);
Req()(OrdersController.prototype, 'create', 0);
Body()(OrdersController.prototype, 'create', 1);
RequestHeader('idempotency-key')(OrdersController.prototype, 'create', 2);
Res({ passthrough: true })(OrdersController.prototype, 'create', 3);
Req()(OrdersController.prototype, 'list', 0);
Query()(OrdersController.prototype, 'list', 1);
Req()(OrdersController.prototype, 'getOne', 0);
Param('orderId')(OrdersController.prototype, 'getOne', 1);
Req()(OrdersController.prototype, 'pay', 0);
Param('orderId')(OrdersController.prototype, 'pay', 1);
Body()(OrdersController.prototype, 'pay', 2);
Req()(OrdersController.prototype, 'cancel', 0);
Param('orderId')(OrdersController.prototype, 'cancel', 1);

module.exports = { OrdersController };
