const { Controller, Get, Inject } = require('@nestjs/common');
const { PrismaService } = require('../prisma/prisma.service');

@Controller('health')
class HealthController {
  constructor(prisma) {
    this.prisma = prisma;
  }

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}

// В JavaScript у аргумента конструктора нет типа, поэтому токен указываем явно.
Inject(PrismaService)(HealthController, undefined, 0);

module.exports = { HealthController };
