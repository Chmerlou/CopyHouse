const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const { Injectable, Inject } = require('@nestjs/common');
const { PrismaService } = require('../prisma/prisma.service');
const { apiError } = require('../common/api-error');
const { looksLikePdf, countPdfPages } = require('./pdf');
const { fileAccess, qualifyingOrderWhere } = require('./access');

@Injectable()
class DocumentsService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async upload(user, file) {
    if (!file || !file.buffer) {
      throw apiError('VALIDATION_ERROR', {
        details: [{ field: 'file', message: 'Приложите PDF-файл' }],
      });
    }
    if (!looksLikePdf(file)) {
      throw apiError('UNSUPPORTED_FILE_TYPE');
    }

    let pageCount;
    try {
      pageCount = await countPdfPages(file.buffer);
    } catch {
      throw apiError('INVALID_PDF');
    }
    if (!pageCount || pageCount < 1) {
      throw apiError('EMPTY_PDF');
    }

    const id = randomUUID();
    const storageKey = path.posix.join('documents', `${id}.pdf`);
    const absolutePath = this.absolutePath(storageKey);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, file.buffer);

    try {
      const document = await this.prisma.document.create({
        data: {
          id,
          userId: user.id,
          originalName: file.originalname || 'document.pdf',
          storageKey,
          mimeType: 'application/pdf',
          sizeBytes: file.size || file.buffer.length,
          pageCount,
        },
      });
      return toDocument(document);
    } catch (error) {
      await fs.unlink(absolutePath).catch(() => undefined);
      throw error;
    }
  }

  async getOwn(user, documentId) {
    const document = await this.findDocument(documentId);
    if (!document) {
      throw apiError('NOT_FOUND');
    }
    if (document.userId !== user.id) {
      throw apiError('DOCUMENT_NOT_OWNER');
    }
    return toDocument(document);
  }

  async openFile(user, documentId) {
    const document = await this.findDocument(documentId);
    let qualifyingOrder = null;
    if (document && user.role === 'PrintProvider') {
      qualifyingOrder = await this.prisma.order.findFirst({
        where: qualifyingOrderWhere(document.id, user.id),
      });
    }

    const decision = fileAccess({ document, user, qualifyingOrder });
    if (decision !== 'OK') {
      throw apiError(decision);
    }

    return {
      absolutePath: this.absolutePath(document.storageKey),
      originalName: document.originalName,
    };
  }

  findDocument(documentId) {
    if (!isUuid(documentId)) {
      return Promise.resolve(null);
    }
    return this.prisma.document.findUnique({ where: { id: documentId } });
  }

  absolutePath(storageKey) {
    const root = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
    const full = path.resolve(root, storageKey);
    if (full !== root && !full.startsWith(root + path.sep)) {
      throw apiError('INTERNAL_ERROR');
    }
    return full;
  }
}

Inject(PrismaService)(DocumentsService, undefined, 0);

function toDocument(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    sizeBytes: document.sizeBytes,
    pageCount: document.pageCount,
    createdAt: document.createdAt.toISOString(),
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value || '',
  );
}

module.exports = { DocumentsService };
