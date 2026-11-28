const { apiError } = require('./api-error');

const MAX_PAGE = 1000;

function parsePage(value) {
  return parseBoundedInt(value, 'page', 1, MAX_PAGE, 1);
}

function parseLimit(value) {
  return parseBoundedInt(value, 'limit', 1, 100, 20);
}

function parseSearch(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  if (typeof value !== 'string') {
    throw apiError('VALIDATION_ERROR', {
      details: [{ field: 'q', message: 'Строка поиска должна быть текстом' }],
    });
  }
  const query = value.trim();
  if (query.length > 200) {
    throw apiError('VALIDATION_ERROR', {
      details: [{ field: 'q', message: 'Строка поиска не длиннее 200 символов' }],
    });
  }
  return query;
}

function pageResult(items, totalItems, page, limit) {
  return {
    items,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
    },
  };
}

function parseBoundedInt(value, field, minimum, maximum, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw invalidNumber(field);
  }
  const parsed = Number(value);
  if (parsed < minimum || parsed > maximum) {
    throw invalidNumber(field);
  }
  return parsed;
}

function invalidNumber(field) {
  return apiError('VALIDATION_ERROR', {
    details: [{ field, message: 'Укажите целое число в допустимом диапазоне' }],
  });
}

module.exports = { MAX_PAGE, parsePage, parseLimit, parseSearch, pageResult };
