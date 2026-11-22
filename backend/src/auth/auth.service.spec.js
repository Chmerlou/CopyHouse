const { AuthService } = require('./auth.service');

describe('AuthService', () => {
  function createService(overrides = {}) {
    const prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      ...overrides.prisma,
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('token') };
    return { service: new AuthService(prisma, jwt), prisma, jwt };
  }

  it('rejects a weak password before writing to the database', async () => {
    const { service, prisma } = createService();

    await expect(
      service.register({
        email: 'client@copyhouse.local',
        password: 'password',
        role: 'CLIENT',
        city: 'Калуга',
      }),
    ).rejects.toMatchObject({
      response: { code: 'WEAK_PASSWORD', statusCode: 400 },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('creates a client and does not return the password', async () => {
    const { service, prisma } = createService();
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'client@copyhouse.local',
      role: 'CLIENT',
      city: 'Калуга',
    });

    await expect(
      service.register({
        email: 'Client@CopyHouse.local',
        password: 'secret12',
        role: 'CLIENT',
        city: ' Калуга ',
      }),
    ).resolves.toEqual({
      id: 'user-1',
      email: 'client@copyhouse.local',
      role: 'CLIENT',
      city: 'Калуга',
    });
  });

  it('does not reveal whether the email exists on a bad login', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@copyhouse.local', password: 'secret12' }),
    ).rejects.toMatchObject({
      response: { code: 'INVALID_CREDENTIALS', statusCode: 401 },
    });
  });
});
