const { Module } = require('@nestjs/common');
const { DocumentsController } = require('./documents.controller');
const { DocumentsService } = require('./documents.service');
const { AuthModule } = require('../auth/auth.module');

@Module({
  imports: [AuthModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
class DocumentsModule {}

module.exports = { DocumentsModule };
