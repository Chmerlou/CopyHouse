const {
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
  Inject,
  Param,
  Req,
  Res,
  UploadedFile,
} = require('@nestjs/common');
const { FileInterceptor } = require('@nestjs/platform-express');
const { DocumentsService } = require('./documents.service');
const { JwtAuthGuard } = require('../auth/jwt-auth.guard');
const { RolesGuard } = require('../auth/roles.guard');
const { Roles } = require('../auth/roles.decorator');

const MAX_PDF_BYTES = 50 * 1024 * 1024;

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
class DocumentsController {
  constructor(documents) {
    this.documents = documents;
  }

  @Post()
  @Roles('CLIENT')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_PDF_BYTES } }))
  upload(request, file) {
    return this.documents.upload(request.user, file);
  }

  @Get(':documentId')
  getOne(request, documentId) {
    return this.documents.getOwn(request.user, documentId);
  }

  @Get(':documentId/file')
  async download(request, documentId, response) {
    const file = await this.documents.openFile(request.user, documentId);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', contentDisposition(file.originalName));
    response.sendFile(file.absolutePath);
  }
}

Inject(DocumentsService)(DocumentsController, undefined, 0);
Req()(DocumentsController.prototype, 'upload', 0);
UploadedFile()(DocumentsController.prototype, 'upload', 1);
Req()(DocumentsController.prototype, 'getOne', 0);
Param('documentId')(DocumentsController.prototype, 'getOne', 1);
Req()(DocumentsController.prototype, 'download', 0);
Param('documentId')(DocumentsController.prototype, 'download', 1);
Res()(DocumentsController.prototype, 'download', 2);

function contentDisposition(filename) {
  const source = filename || 'document.pdf';
  const fallback = source.replace(/[^\w.-]+/g, '_') || 'document.pdf';
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(source)}`;
}

module.exports = { DocumentsController };
