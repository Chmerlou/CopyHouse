const { fileAccess } = require('./access');

describe('fileAccess', () => {
  const document = { id: 'doc-1', userId: 'client-1' };

  it('lets the owner download the file', () => {
    expect(fileAccess({ document, user: { id: 'client-1', role: 'CLIENT' }, qualifyingOrder: null })).toBe('OK');
  });

  it('hides another client document', () => {
    expect(fileAccess({ document, user: { id: 'client-2', role: 'CLIENT' }, qualifyingOrder: null })).toBe(
      'DOCUMENT_NOT_OWNER',
    );
  });

  it('lets a print provider download only through a qualifying order', () => {
    const provider = { id: 'provider-1', role: 'PrintProvider' };
    expect(fileAccess({ document, user: provider, qualifyingOrder: null })).toBe('DOCUMENT_NOT_AVAILABLE');
    expect(fileAccess({ document, user: provider, qualifyingOrder: { id: 'order-1' } })).toBe('OK');
  });

  it('does not give the file to an admin in this version', () => {
    expect(fileAccess({ document, user: { id: 'admin-1', role: 'ADMIN' }, qualifyingOrder: null })).toBe(
      'DOCUMENT_NOT_AVAILABLE',
    );
  });
});
