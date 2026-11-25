const { Module } = require('@nestjs/common');
const { AuthModule } = require('../auth/auth.module');
const { QuotesController } = require('./quotes.controller');
const { QuotesService } = require('./quotes.service');

@Module({
  imports: [AuthModule],
  controllers: [QuotesController],
  providers: [QuotesService],
})
class QuotesModule {}

module.exports = { QuotesModule };
