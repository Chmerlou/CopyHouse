const { Catch, HttpException } = require('@nestjs/common');
const { MulterError } = require('multer');
const { errorBody } = require('./api-error');

const CODE_BY_STATUS = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  413: 'FILE_TOO_LARGE',
  415: 'UNSUPPORTED_FILE_TYPE',
};

@Catch()
class ApiExceptionFilter {
  catch(exception, host) {
    const response = host.switchToHttp().getResponse();

    if (exception instanceof MulterError && exception.code === 'LIMIT_FILE_SIZE') {
      const body = errorBody('FILE_TOO_LARGE');
      response.status(body.statusCode).json(body);
      return;
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();
      if (payload && typeof payload === 'object' && payload.code) {
        response.status(statusCode).json(payload);
        return;
      }

      response.status(statusCode).json({
        statusCode,
        code: codeForStatus(statusCode),
        message: messageFromPayload(payload, statusCode),
      });
      return;
    }

    console.error(exception);
    const body = errorBody('INTERNAL_ERROR');
    response.status(body.statusCode).json(body);
  }
}

function codeForStatus(statusCode) {
  if (CODE_BY_STATUS[statusCode]) {
    return CODE_BY_STATUS[statusCode];
  }
  if (statusCode >= 500) {
    return 'INTERNAL_ERROR';
  }
  return `HTTP_${statusCode}`;
}

function messageFromPayload(payload, statusCode) {
  const fallback = errorBody(codeForStatus(statusCode)).message;
  if (typeof payload === 'string') {
    return safeText(payload) || fallback;
  }
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }
  if (typeof payload.message === 'string') {
    return safeText(payload.message) || fallback;
  }
  if (Array.isArray(payload.message)) {
    const text = payload.message.filter((item) => typeof item === 'string').join('; ');
    return safeText(text) || fallback;
  }
  return fallback;
}

function safeText(value) {
  const text = value.trim();
  if (!text || text.length > 300 || text.includes('\n') || /prisma/i.test(text)) {
    return '';
  }
  return text;
}

module.exports = { ApiExceptionFilter };
