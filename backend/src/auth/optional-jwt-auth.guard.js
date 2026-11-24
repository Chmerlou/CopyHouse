const { Injectable } = require('@nestjs/common');
const { AuthGuard } = require('@nestjs/passport');
const { apiError } = require('../common/api-error');

@Injectable()
class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(error, user, info, context) {
    const request = context.switchToHttp().getRequest();
    if (request.headers.authorization === undefined) {
      return null;
    }
    if (error || !user) {
      throw apiError('UNAUTHORIZED');
    }
    return user;
  }
}

module.exports = { OptionalJwtAuthGuard };
