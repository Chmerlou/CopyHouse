const { HealthController } = require('./health.controller');

describe('HealthController', () => {
  it('returns ok when the database answers', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue(1),
    };
    const controller = new HealthController(prisma);

    await expect(controller.check()).resolves.toEqual({ status: 'ok' });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
