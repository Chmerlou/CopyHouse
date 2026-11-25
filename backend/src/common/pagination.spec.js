const { MAX_PAGE, parsePage } = require('./pagination');

describe('parsePage', () => {
  it('accepts the last allowed page', () => {
    expect(parsePage(String(MAX_PAGE))).toBe(MAX_PAGE);
  });

  it('rejects a page above the offset cap', () => {
    expect(() => parsePage(String(MAX_PAGE + 1))).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({ code: 'VALIDATION_ERROR', statusCode: 400 }),
      }),
    );
  });
});
