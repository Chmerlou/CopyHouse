const { HttpException } = require('@nestjs/common');

const ERRORS = {
  VALIDATION_ERROR: [400, 'Bad Request', 'Проверьте заполненные поля'],
  INVALID_EMAIL: [400, 'Bad Request', 'Укажите корректный адрес электронной почты'],
  WEAK_PASSWORD: [
    400,
    'Bad Request',
    'Пароль должен содержать от 8 до 72 символов, минимум одну латинскую букву и одну цифру',
  ],
  UNSUPPORTED_FILE_TYPE: [415, 'Unsupported Media Type', 'Поддерживается только PDF'],
  INVALID_PDF: [400, 'Bad Request', 'Файл повреждён или не является корректным PDF'],
  EMPTY_PDF: [400, 'Bad Request', 'В документе нет страниц'],
  UNAUTHORIZED: [401, 'Unauthorized', 'Требуется авторизация'],
  INVALID_CREDENTIALS: [401, 'Unauthorized', 'Неверный email или пароль'],
  FORBIDDEN: [403, 'Forbidden', 'Недостаточно прав'],
  NOT_FOUND: [404, 'Not Found', 'Не найдено'],
  DOCUMENT_NOT_OWNER: [404, 'Not Found', 'Документ принадлежит другому пользователю'],
  DOCUMENT_NOT_AVAILABLE: [404, 'Not Found', 'Документ недоступен для скачивания'],
  EMAIL_ALREADY_USED: [409, 'Conflict', 'Этот email уже используется'],
  FILE_TOO_LARGE: [413, 'Payload Too Large', 'Максимальный размер файла — 50 МБ'],
  INTERNAL_ERROR: [500, 'Internal Server Error', 'Не удалось выполнить операцию'],
};

function errorBody(code, extra = {}) {
  const spec = ERRORS[code] || ERRORS.INTERNAL_ERROR;
  const body = {
    statusCode: spec[0],
    code: ERRORS[code] ? code : 'INTERNAL_ERROR',
    error: spec[1],
    message: extra.message || spec[2],
  };
  if (extra.details) {
    body.details = extra.details;
  }
  return body;
}

function apiError(code, extra) {
  const body = errorBody(code, extra);
  return new HttpException(body, body.statusCode);
}

module.exports = { ERRORS, errorBody, apiError };
