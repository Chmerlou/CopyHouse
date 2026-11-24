const { Controller, Get, Inject, Query, Req, UseGuards } = require('@nestjs/common');
const { OptionalJwtAuthGuard } = require('../auth/optional-jwt-auth.guard');
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
}

Inject(PrintPointsService)(PrintPointsController, undefined, 0);
Req()(PrintPointsController.prototype, 'list', 0);
Query()(PrintPointsController.prototype, 'list', 1);

module.exports = { PrintPointsController };
