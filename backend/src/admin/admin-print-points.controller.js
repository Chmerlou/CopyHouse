const { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Query, Req, UseGuards } = require('@nestjs/common');
const { JwtAuthGuard } = require('../auth/jwt-auth.guard');
const { Roles } = require('../auth/roles.decorator');
const { RolesGuard } = require('../auth/roles.guard');
const { AdminPrintPointsService } = require('./admin-print-points.service');

@Controller('admin/print-points')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
class AdminPrintPointsController {
  constructor(adminPrintPoints) {
    this.adminPrintPoints = adminPrintPoints;
  }

  @Get()
  list(request, query) {
    return this.adminPrintPoints.list(query || {});
  }

  @Post(':printPointId/approve')
  @HttpCode(200)
  approve(printPointId) {
    return this.adminPrintPoints.approve(printPointId);
  }

  @Post(':printPointId/reject')
  @HttpCode(200)
  reject(printPointId, body) {
    return this.adminPrintPoints.reject(printPointId, body || {});
  }

  @Patch(':printPointId')
  setActive(printPointId, body) {
    return this.adminPrintPoints.setActive(printPointId, body || {});
  }
}

Inject(AdminPrintPointsService)(AdminPrintPointsController, undefined, 0);
Req()(AdminPrintPointsController.prototype, 'list', 0);
Query()(AdminPrintPointsController.prototype, 'list', 1);
Param('printPointId')(AdminPrintPointsController.prototype, 'approve', 0);
Param('printPointId')(AdminPrintPointsController.prototype, 'reject', 0);
Body()(AdminPrintPointsController.prototype, 'reject', 1);
Param('printPointId')(AdminPrintPointsController.prototype, 'setActive', 0);
Body()(AdminPrintPointsController.prototype, 'setActive', 1);

module.exports = { AdminPrintPointsController };
