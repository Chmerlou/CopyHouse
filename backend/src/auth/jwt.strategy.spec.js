const { JwtStrategy, tokenVersionMatches } = require('./jwt.strategy');

describe('token version', () => {
  const user = { tokenVersion: 2 };

  it('accepts the token issued for the current session version', () => {
    expect(tokenVersionMatches({ tv: 2 }, user)).toBe(true);
  });

  it('rejects a token from before logout and a token without a version', () => {
    expect(tokenVersionMatches({ tv: 1 }, user)).toBe(false);
    expect(tokenVersionMatches({}, user)).toBe(false);
  });
});

describe('JwtStrategy', () => {
  it('puts only the profile on the request and leaves out the password hash', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'client@copyhouse.local',
          passwordHash: 'secret-hash',
          role: 'CLIENT',
          city: 'Калуга',
          tokenVersion: 2,
        }),
      },
    };
    const strategy = new JwtStrategy({ getOrThrow: () => 'test-secret' }, prisma);

    await expect(strategy.validate({ sub: 'user-1', tv: 2 })).resolves.toEqual({
      id: 'user-1',
      email: 'client@copyhouse.local',
      role: 'CLIENT',
      city: 'Калуга',
    });
  });
});
