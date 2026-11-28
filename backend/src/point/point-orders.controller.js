const { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, Req, UseGuards } = require('@nestjs/common');
const { JwtAuthGuard } = require('../auth/jwt-auth.guard');
const { Roles } = require('../auth/roles.decorator');
const { RolesGuard } = require('../auth/roles.guard');
const { PointOrdersService } = require('./point-orders.service');

@Controller('point/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PrintProvider')
class PointOrdersController {
  constructor(pointOrders) {
    this.pointOrders = pointOrders;
  }

  @Get()
  list(request, query) {
    return this.pointOrders.list(request.user, query || {});
  }

  @Get(':orderId')
  getOne(request, orderId) {
    return this.pointOrders.getOne(request.user, orderId);
  }

  @Post(':orderId/start')
  @HttpCode(200)
  start(request, orderId) {
    return this.pointOrders.start(request.user, orderId);
  }

  @Post(':orderId/ready')
  @HttpCode(200)
  ready(request, orderId) {
    return this.pointOrders.ready(request.user, orderId);
  }

  @Post(':orderId/issue')
  @HttpCode(200)
  issue(request, orderId, body) {
    return this.pointOrders.issue(request.user, orderId, body || {});
  }

  @Post(':orderId/cancel')
  @HttpCode(200)
  cancel(request, orderId, body) {
    return this.pointOrders.cancel(request.user, orderId, body || {});
  }
}

Inject(PointOrdersService)(PointOrdersController, undefined, 0);
Req()(PointOrdersController.prototype, 'list', 0);
Query()(PointOrdersController.prototype, 'list', 1);
Req()(PointOrdersController.prototype, 'getOne', 0);
Param('orderId')(PointOrdersController.prototype, 'getOne', 1);
Req()(PointOrdersController.prototype, 'start', 0);
Param('orderId')(PointOrdersController.prototype, 'start', 1);
Req()(PointOrdersController.prototype, 'ready', 0);
Param('orderId')(PointOrdersController.prototype, 'ready', 1);
Req()(PointOrdersController.prototype, 'issue', 0);
Param('orderId')(PointOrdersController.prototype, 'issue', 1);
Body()(PointOrdersController.prototype, 'issue', 2);
Req()(PointOrdersController.prototype, 'cancel', 0);
Param('orderId')(PointOrdersController.prototype, 'cancel', 1);
Body()(PointOrdersController.prototype, 'cancel', 2);

module.exports = { PointOrdersController };
