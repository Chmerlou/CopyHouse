const { Module } = require('@nestjs/common');
const { AuthModule } = require('../auth/auth.module');
const { PrintPointsController } = require('./print-points.controller');
const { PrintPointsService } = require('./print-points.service');

@Module({
  imports: [AuthModule],
  controllers: [PrintPointsController],
  providers: [PrintPointsService],
})
class PrintPointsModule {}

module.exports = { PrintPointsModule };
