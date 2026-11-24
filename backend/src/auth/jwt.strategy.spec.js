const { tokenVersionMatches } = require('./jwt.strategy');

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
