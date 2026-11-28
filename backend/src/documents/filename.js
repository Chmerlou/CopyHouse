const legacyDecoder = new TextDecoder('utf-8', { fatal: true });

function documentName(name) {
  if (!name || !/[\u0080-\u00ff]/u.test(name) || /[\u0100-\u{10ffff}]/u.test(name)) return name;
  try {
    // Old multipart parsing stored UTF-8 bytes as Latin-1 characters.
    const restored = legacyDecoder.decode(Buffer.from(name, 'latin1'));
    return /\p{Script=Cyrillic}/u.test(restored) ? restored : name;
  } catch {
    return name;
  }
}

module.exports = { documentName };
