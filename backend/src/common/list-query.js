const { apiError } = require('./api-error');

function parseDate(value, field) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw apiError('VALIDATION_ERROR', {
      details: [{ field, message: 'Укажите дату и время' }],
    });
  }
  return new Date(value);
}

function parseSort(query) {
  const sortBy = query && query.sortBy;
  if (sortBy !== undefined && sortBy !== '' && sortBy !== 'createdAt') {
    throw apiError('VALIDATION_ERROR', {
      details: [{ field: 'sortBy', message: 'Сортировка доступна только по дате создания' }],
    });
  }
  const value = query && query.sortOrder;
  if (value === undefined || value === null || value === '' || value === 'desc') {
    return 'desc';
  }
  if (value === 'asc') {
    return 'asc';
  }
  throw apiError('VALIDATION_ERROR', {
    details: [{ field: 'sortOrder', message: 'Порядок сортировки: asc или desc' }],
  });
}

module.exports = { parseDate, parseSort };
