const POSTGRES_INT_MAX = 2147483647;

function rateFor(colorMode, point) {
  if (colorMode === 'BW') {
    return point.pricePerPageBw;
  }
  if (colorMode === 'COLOR') {
    return point.pricePerPageColor;
  }
  return null;
}

function calculatePrice({ pageCount, copies, unitPrice, commissionBps }) {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    return { ok: false };
  }
  if (!Number.isInteger(copies) || copies < 1 || copies > 100) {
    return { ok: false };
  }
  if (!Number.isInteger(unitPrice) || unitPrice < 0) {
    return { ok: false };
  }
  if (!Number.isInteger(commissionBps) || commissionBps < 0) {
    return { ok: false };
  }

  const subtotal = pageCount * copies * unitPrice;
  const commissionAmount = Math.floor((subtotal * commissionBps) / 10000);
  const total = subtotal;
  if (
    !Number.isSafeInteger(subtotal) ||
    !Number.isSafeInteger(commissionAmount) ||
    subtotal > POSTGRES_INT_MAX ||
    commissionAmount > POSTGRES_INT_MAX ||
    total > POSTGRES_INT_MAX
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    unitPrice,
    subtotal,
    commissionBps,
    commissionAmount,
    total,
    currency: 'RUB',
  };
}

module.exports = { POSTGRES_INT_MAX, rateFor, calculatePrice };
