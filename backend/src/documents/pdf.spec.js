const { PDFDocument } = require('pdf-lib');
const { countPdfPages, looksLikePdf } = require('./pdf');

describe('pdf', () => {
  it('counts pages of a real PDF', async () => {
    const document = await PDFDocument.create();
    document.addPage();
    document.addPage();
    const bytes = Buffer.from(await document.save());

    await expect(countPdfPages(bytes)).resolves.toBe(2);
    expect(looksLikePdf({ buffer: bytes, mimetype: 'application/octet-stream', originalname: 'a.pdf' })).toBe(true);
  });

  it('rejects a file that is not a PDF', () => {
    expect(
      looksLikePdf({
        buffer: Buffer.from('hello'),
        mimetype: 'text/plain',
        originalname: 'note.txt',
      }),
    ).toBe(false);
  });
});
