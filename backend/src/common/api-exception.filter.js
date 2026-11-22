const { Catch, HttpException } = require('@nestjs/common');
const { MulterError } = require('multer');
const { errorBody } = require('./api-error');

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
      const payload = exception.getResponse();
      if (payload && typeof payload === 'object' && payload.code) {
        response.status(exception.getStatus()).json(payload);
        return;
      }
    }

    if (!(exception instanceof HttpException)) {
      console.error(exception);
    }

    const body = errorBody('INTERNAL_ERROR');
    response.status(body.statusCode).json(body);
  }
}

module.exports = { ApiExceptionFilter };
