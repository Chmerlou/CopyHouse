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
  INVALID_PICKUP_CODE: [400, 'Bad Request', 'Неверный код выдачи'],
  UNAUTHORIZED: [401, 'Unauthorized', 'Требуется авторизация'],
  INVALID_CREDENTIALS: [401, 'Unauthorized', 'Неверный email или пароль'],
  FORBIDDEN: [403, 'Forbidden', 'Недостаточно прав'],
  NOT_FOUND: [404, 'Not Found', 'Не найдено'],
  DOCUMENT_NOT_OWNER: [404, 'Not Found', 'Документ принадлежит другому пользователю'],
  DOCUMENT_NOT_AVAILABLE: [404, 'Not Found', 'Документ недоступен для скачивания'],
  PRINT_POINT_NOT_FOUND: [404, 'Not Found', 'Точка не найдена'],
  PRINT_POINT_NOT_OWNER: [404, 'Not Found', 'Точка принадлежит другому владельцу'],
  ORDER_NOT_OWNER: [404, 'Not Found', 'Заказ принадлежит другому пользователю'],
  ORDER_NOT_IN_POINT: [404, 'Not Found', 'Заказ принадлежит точке другого владельца'],
  QUOTE_NOT_FOUND: [404, 'Not Found', 'Расчёт не найден'],
  QUOTE_NOT_OWNER: [404, 'Not Found', 'Расчёт принадлежит другому пользователю'],
  EMAIL_ALREADY_USED: [409, 'Conflict', 'Этот email уже используется'],
  QUOTE_EXPIRED: [409, 'Conflict', 'Расчёт устарел, запросите стоимость ещё раз'],
  CITY_CHANGED: [409, 'Conflict', 'Город в профиле изменился, запросите стоимость ещё раз'],
  PRICE_CHANGED: [409, 'Conflict', 'Тариф изменился, запросите стоимость ещё раз'],
  QUOTE_POINT_MISMATCH: [409, 'Conflict', 'Выбранной точки нет в этом расчёте'],
  PRINT_POINT_NOT_APPROVED: [409, 'Conflict', 'Точка ещё не одобрена'],
  PRINT_POINT_INACTIVE: [409, 'Conflict', 'Точка временно не принимает заказы'],
  PRINT_POINT_ALREADY_APPROVED: [409, 'Conflict', 'У одобренной точки можно менять только тарифы'],
  PRINT_POINT_NOT_PENDING: [409, 'Conflict', 'Модерировать можно только заявку, которая ожидает решения'],
  ORDER_NOT_CANCELLABLE: [409, 'Conflict', 'Заказ нельзя отменить'],
  ORDER_NOT_PAYABLE: [409, 'Conflict', 'Оплатить можно только заказ в статусе «Создан»'],
  PAYMENT_ALREADY_SUCCEEDED: [409, 'Conflict', 'Заказ уже оплачен'],
  INVALID_STATUS_TRANSITION: [409, 'Conflict', 'Недопустимый переход статуса'],
  ORDER_ALREADY_ISSUED: [409, 'Conflict', 'Заказ уже выдан'],
  TARIFF_MISSING: [409, 'Conflict', 'У точки нет тарифа для выбранного режима печати'],
  IDEMPOTENCY_KEY_MISMATCH: [409, 'Conflict', 'Этот ключ уже использован для другого заказа'],
  IDEMPOTENCY_IN_PROGRESS: [409, 'Conflict', 'Запрос с этим ключом ещё выполняется'],
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
