const { Module } = require('@nestjs/common');
const { ConfigModule } = require('@nestjs/config');
const { HealthModule } = require('./health/health.module');
const { PrismaModule } = require('./prisma/prisma.module');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
  ],
})
class AppModule {}

module.exports = { AppModule };
