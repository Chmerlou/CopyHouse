const { Controller, Post, UseGuards, Inject, Body, Req } = require('@nestjs/common');
const { JwtAuthGuard } = require('../auth/jwt-auth.guard');
const { RolesGuard } = require('../auth/roles.guard');
const { Roles } = require('../auth/roles.decorator');
const { QuotesService } = require('./quotes.service');

@Controller('quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
class QuotesController {
  constructor(quotes) {
    this.quotes = quotes;
  }

  @Post()
  @Roles('CLIENT')
  create(request, body) {
    return this.quotes.create(request.user, body || {});
  }
}

Inject(QuotesService)(QuotesController, undefined, 0);
Req()(QuotesController.prototype, 'create', 0);
Body()(QuotesController.prototype, 'create', 1);

module.exports = { QuotesController };
