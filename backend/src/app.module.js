const { Module } = require('@nestjs/common');
const { ConfigModule } = require('@nestjs/config');
const { AdminModule } = require('./admin/admin.module');
const { AuthModule } = require('./auth/auth.module');
const { DocumentsModule } = require('./documents/documents.module');
const { HealthModule } = require('./health/health.module');
const { OrdersModule } = require('./orders/orders.module');
const { PointOrdersModule } = require('./point/point-orders.module');
const { PrintPointsModule } = require('./print-points/print-points.module');
const { PrismaModule } = require('./prisma/prisma.module');
const { QuotesModule } = require('./quotes/quotes.module');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    DocumentsModule,
    HealthModule,
    PrintPointsModule,
    QuotesModule,
    OrdersModule,
    PointOrdersModule,
    AdminModule,
  ],
})
class AppModule {}

module.exports = { AppModule };
