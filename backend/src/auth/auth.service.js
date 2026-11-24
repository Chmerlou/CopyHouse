const { Injectable, Inject } = require('@nestjs/common');
const { JwtService } = require('@nestjs/jwt');
const bcrypt = require('bcryptjs');
const { PrismaService } = require('../prisma/prisma.service');
const { apiError } = require('../common/api-error');
const {
  normalizeEmail,
  isValidEmail,
  isValidPassword,
  normalizeCity,
  isValidCity,
  toUser,
} = require('../common/user-input');

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const REGISTER_ROLES = new Set(['CLIENT', 'PrintProvider']);

@Injectable()
class AuthService {
  constructor(prisma, jwt) {
    this.prisma = prisma;
    this.jwt = jwt;
  }

  async register(body) {
    const email = normalizeEmail(body && body.email);
    const password = body && body.password;
    const role = body && body.role;
    const city = normalizeCity(body && body.city);

    if (!isValidEmail(body && body.email)) {
      throw apiError('INVALID_EMAIL');
    }
    if (!isValidPassword(password)) {
      throw apiError('WEAK_PASSWORD');
    }
    if (!REGISTER_ROLES.has(role) || !isValidCity(city)) {
      throw apiError('VALIDATION_ERROR', {
        details: invalidRegisterDetails(role, city),
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    try {
      const user = await this.prisma.user.create({
        data: { email, passwordHash, role, city },
      });
      return toUser(user);
    } catch (error) {
      if (error && error.code === 'P2002') {
        throw apiError('EMAIL_ALREADY_USED');
      }
      throw error;
    }
  }

  async login(body) {
    const password = body && body.password;
    if (!isValidEmail(body && body.email)) {
      throw apiError('INVALID_EMAIL');
    }
    if (typeof password !== 'string' || password.length === 0 || password.length > 72) {
      throw apiError('VALIDATION_ERROR', {
        details: [{ field: 'password', message: 'Введите пароль' }],
      });
    }

    const email = normalizeEmail(body.email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    const matches = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !matches) {
      throw apiError('INVALID_CREDENTIALS');
    }

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role, tv: user.tokenVersion },
      { expiresIn: TOKEN_TTL_SECONDS },
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: TOKEN_TTL_SECONDS,
      user: toUser(user),
    };
  }

  updateCity(user, body) {
    const city = normalizeCity(body && body.city);
    if (!isValidCity(city)) {
      throw apiError('VALIDATION_ERROR', {
        details: [{ field: 'city', message: 'Укажите город' }],
      });
    }

    return this.prisma.user
      .update({ where: { id: user.id }, data: { city } })
      .then(toUser);
  }

  async logout(user) {
    try {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { tokenVersion: { increment: 1 } },
      });
    } catch (error) {
      if (error && error.code === 'P2025') {
        throw apiError('UNAUTHORIZED');
      }
      throw error;
    }
  }
}

function invalidRegisterDetails(role, city) {
  const details = [];
  if (!REGISTER_ROLES.has(role)) {
    details.push({ field: 'role', message: 'Выберите роль клиента или владельца точки' });
  }
  if (!isValidCity(city)) {
    details.push({ field: 'city', message: 'Укажите город' });
  }
  return details;
}

Inject(PrismaService)(AuthService, undefined, 0);
Inject(JwtService)(AuthService, undefined, 1);

module.exports = { AuthService, TOKEN_TTL_SECONDS };
