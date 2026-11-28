const { documentName } = require('./filename');

it('restores Cyrillic filenames stored before UTF-8 multipart decoding', () => {
  const name = 'Документы для печати.pdf';
  expect(documentName(Buffer.from(name, 'utf8').toString('latin1'))).toBe(name);
  expect(documentName(name)).toBe(name);
  expect(documentName('Résumé.pdf')).toBe('Résumé.pdf');
});
