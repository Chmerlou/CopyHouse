const { Module } = require('@nestjs/common');
const { AuthModule } = require('../auth/auth.module');
const { AdminPrintPointsController } = require('./admin-print-points.controller');
const { AdminPrintPointsService } = require('./admin-print-points.service');

@Module({
  imports: [AuthModule],
  controllers: [AdminPrintPointsController],
  providers: [AdminPrintPointsService],
})
class AdminModule {}

module.exports = { AdminModule };
