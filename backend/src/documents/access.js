const PAID_STATUSES = ['PAID', 'PRINTING', 'READY', 'ISSUED'];

function fileAccess({ document, user, qualifyingOrder }) {
  if (!document) {
    return 'NOT_FOUND';
  }
  if (!user) {
    return 'UNAUTHORIZED';
  }
  if (user.role === 'ADMIN') {
    return 'DOCUMENT_NOT_AVAILABLE';
  }
  if (user.role === 'CLIENT') {
    return document.userId === user.id ? 'OK' : 'DOCUMENT_NOT_OWNER';
  }
  if (user.role === 'PrintProvider') {
    return qualifyingOrder ? 'OK' : 'DOCUMENT_NOT_AVAILABLE';
  }
  return 'FORBIDDEN';
}

function qualifyingOrderWhere(documentId, ownerId) {
  return {
    documentId,
    printPoint: { ownerId },
    OR: [
      { status: { in: PAID_STATUSES } },
      {
        status: 'CANCELLED',
        payment: { status: { in: ['SUCCEEDED', 'REFUNDED'] } },
      },
    ],
  };
}

module.exports = { fileAccess, qualifyingOrderWhere };
