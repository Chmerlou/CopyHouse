const { Module } = require('@nestjs/common');
const { AuthModule } = require('../auth/auth.module');
const { OrdersController } = require('./orders.controller');
const { OrdersService } = require('./orders.service');

@Module({
  imports: [AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
class OrdersModule {}

module.exports = { OrdersModule };
