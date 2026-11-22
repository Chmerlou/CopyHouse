const { Module } = require('@nestjs/common');
const { JwtModule } = require('@nestjs/jwt');
const { PassportModule } = require('@nestjs/passport');
const { ConfigModule, ConfigService } = require('@nestjs/config');
const { AuthController } = require('./auth.controller');
const { AuthService, TOKEN_TTL_SECONDS } = require('./auth.service');
const { JwtStrategy } = require('./jwt.strategy');
const { RolesGuard } = require('./roles.guard');

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config) => ({
        secret: config.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: TOKEN_TTL_SECONDS },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [RolesGuard],
})
class AuthModule {}

module.exports = { AuthModule };
