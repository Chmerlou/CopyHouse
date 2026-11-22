const { Module } = require('@nestjs/common');
const { ConfigModule } = require('@nestjs/config');
const { AuthModule } = require('./auth/auth.module');
const { DocumentsModule } = require('./documents/documents.module');
const { HealthModule } = require('./health/health.module');
const { PrismaModule } = require('./prisma/prisma.module');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    DocumentsModule,
    HealthModule,
  ],
})
class AppModule {}

module.exports = { AppModule };
