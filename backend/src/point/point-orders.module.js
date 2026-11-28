const { Module } = require('@nestjs/common');
const { AuthModule } = require('../auth/auth.module');
const { PointOrdersController } = require('./point-orders.controller');
const { PointOrdersService } = require('./point-orders.service');

@Module({
  imports: [AuthModule],
  controllers: [PointOrdersController],
  providers: [PointOrdersService],
})
class PointOrdersModule {}

module.exports = { PointOrdersModule };
