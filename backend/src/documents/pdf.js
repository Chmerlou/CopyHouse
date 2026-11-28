const { PDFDocument } = require('pdf-lib');

const PDF_MAGIC = Buffer.from('%PDF');

function looksLikePdf(file) {
  if (!file || !file.buffer) {
    return false;
  }
  const name = typeof file.originalname === 'string' ? file.originalname.toLowerCase() : '';
  const byName = name.endsWith('.pdf');
  const byMime = file.mimetype === 'application/pdf';
  const byMagic = file.buffer.length >= 4 && file.buffer.subarray(0, 4).equals(PDF_MAGIC);
  return byName || byMime || byMagic;
}

async function countPdfPages(buffer) {
  const document = await PDFDocument.load(buffer, { ignoreEncryption: false });
  return document.getPageCount();
}

module.exports = { looksLikePdf, countPdfPages };
