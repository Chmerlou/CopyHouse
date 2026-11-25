const { NotFoundException } = require('@nestjs/common');
const { MulterError } = require('multer');
const { ApiExceptionFilter } = require('./api-exception.filter');
const { apiError } = require('./api-error');

function capture() {
  const response = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  const host = { switchToHttp: () => ({ getResponse: () => response }) };
  return { response, host };
}

describe('ApiExceptionFilter', () => {
  const filter = new ApiExceptionFilter();

  it('keeps the HTTP status of a Nest exception that has no business code', () => {
    const { response, host } = capture();

    filter.catch(new NotFoundException('Cannot GET /api/admin/print-points'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Cannot GET /api/admin/print-points',
    });
  });

  it('passes through an HttpException that already has a code', () => {
    const { response, host } = capture();

    filter.catch(apiError('QUOTE_EXPIRED'), host);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, code: 'QUOTE_EXPIRED' }),
    );
  });

  it('hides Prisma text and answers 500 for an unknown failure', () => {
    const { response, host } = capture();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    filter.catch(new Error('Invalid `prisma.order.create()` invocation'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'Не удалось выполнить операцию',
      }),
    );
    console.error.mockRestore();
  });

  it('maps an oversized upload to FILE_TOO_LARGE', () => {
    const { response, host } = capture();

    filter.catch(new MulterError('LIMIT_FILE_SIZE'), host);

    expect(response.status).toHaveBeenCalledWith(413);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'FILE_TOO_LARGE' }),
    );
  });
});
