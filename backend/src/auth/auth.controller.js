const { Controller, Get, HttpCode, Patch, Post, UseGuards, Inject, Body, Req } = require('@nestjs/common');
const { AuthService } = require('./auth.service');
const { JwtAuthGuard } = require('./jwt-auth.guard');
const { toUser } = require('../common/user-input');

@Controller('auth')
class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  @Post('register')
  register(body) {
    return this.authService.register(body || {});
  }

  @Post('login')
  @HttpCode(200)
  login(body) {
    return this.authService.login(body || {});
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(request) {
    return toUser(request.user);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(request, body) {
    return this.authService.updateCity(request.user, body || {});
  }
}

Inject(AuthService)(AuthController, undefined, 0);
Body()(AuthController.prototype, 'register', 0);
Body()(AuthController.prototype, 'login', 0);
Req()(AuthController.prototype, 'me', 0);
Req()(AuthController.prototype, 'updateMe', 0);
Body()(AuthController.prototype, 'updateMe', 1);

module.exports = { AuthController };
