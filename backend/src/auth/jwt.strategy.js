const { Injectable, Inject } = require('@nestjs/common');
const { PassportStrategy } = require('@nestjs/passport');
const { ExtractJwt, Strategy } = require('passport-jwt');
const { ConfigService } = require('@nestjs/config');
const { PrismaService } = require('../prisma/prisma.service');
const { apiError } = require('../common/api-error');

@Injectable()
class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config, prisma) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow('JWT_SECRET'),
    });
    this.prisma = prisma;
  }

  async validate(payload) {
    if (!payload || typeof payload.sub !== 'string') {
      throw apiError('UNAUTHORIZED');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw apiError('UNAUTHORIZED');
    }
    return user;
  }
}

Inject(ConfigService)(JwtStrategy, undefined, 0);
Inject(PrismaService)(JwtStrategy, undefined, 1);

module.exports = { JwtStrategy };
