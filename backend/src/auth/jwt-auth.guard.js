const { Injectable } = require('@nestjs/common');
const { AuthGuard } = require('@nestjs/passport');
const { apiError } = require('../common/api-error');

@Injectable()
class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(error, user) {
    if (error || !user) {
      throw apiError('UNAUTHORIZED');
    }
    return user;
  }
}

module.exports = { JwtAuthGuard };
