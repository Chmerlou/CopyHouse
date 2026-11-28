const { Injectable, Inject } = require('@nestjs/common');
const { Reflector } = require('@nestjs/core');
const { ROLES_KEY } = require('./roles.decorator');
const { apiError } = require('../common/api-error');

@Injectable()
class RolesGuard {
  constructor(reflector) {
    this.reflector = reflector;
  }

  canActivate(context) {
    const roles = this.reflector.getAllAndOverride(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    if (!request.user || !roles.includes(request.user.role)) {
      throw apiError('FORBIDDEN');
    }
    return true;
  }
}

Inject(Reflector)(RolesGuard, undefined, 0);

module.exports = { RolesGuard };
