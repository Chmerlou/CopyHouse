const { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } = require('@nestjs/common');
const { JwtAuthGuard } = require('../auth/jwt-auth.guard');
const { OptionalJwtAuthGuard } = require('../auth/optional-jwt-auth.guard');
const { Roles } = require('../auth/roles.decorator');
const { RolesGuard } = require('../auth/roles.guard');
const { PrintPointsService } = require('./print-points.service');

@Controller('print-points')
class PrintPointsController {
  constructor(printPointsService) {
    this.printPointsService = printPointsService;
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  list(request, query) {
    return this.printPointsService.listCatalog(request.user, query || {});
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PrintProvider')
  create(request, body) {
    return this.printPointsService.create(request.user, body || {});
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PrintProvider')
  listMine(request, query) {
    return this.printPointsService.listMine(request.user, query || {});
  }

  @Get(':printPointId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PrintProvider')
  getMine(request, printPointId) {
    return this.printPointsService.getMine(request.user, printPointId);
  }

  @Patch(':printPointId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PrintProvider')
  updateMine(request, printPointId, body) {
    return this.printPointsService.updateMine(request.user, printPointId, body || {});
  }

  @Patch(':printPointId/prices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PrintProvider')
  updatePrices(request, printPointId, body) {
    return this.printPointsService.updatePrices(request.user, printPointId, body || {});
  }
}

Inject(PrintPointsService)(PrintPointsController, undefined, 0);
Req()(PrintPointsController.prototype, 'list', 0);
Query()(PrintPointsController.prototype, 'list', 1);
Req()(PrintPointsController.prototype, 'create', 0);
Body()(PrintPointsController.prototype, 'create', 1);
Req()(PrintPointsController.prototype, 'listMine', 0);
Query()(PrintPointsController.prototype, 'listMine', 1);
Req()(PrintPointsController.prototype, 'getMine', 0);
Param('printPointId')(PrintPointsController.prototype, 'getMine', 1);
Req()(PrintPointsController.prototype, 'updateMine', 0);
Param('printPointId')(PrintPointsController.prototype, 'updateMine', 1);
Body()(PrintPointsController.prototype, 'updateMine', 2);
Req()(PrintPointsController.prototype, 'updatePrices', 0);
Param('printPointId')(PrintPointsController.prototype, 'updatePrices', 1);
Body()(PrintPointsController.prototype, 'updatePrices', 2);

module.exports = { PrintPointsController };
