const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isValidEmail(value) {
  const email = normalizeEmail(value);
  return email.length > 0 && email.length <= 255 && EMAIL_PATTERN.test(email);
}

function isValidPassword(value) {
  return (
    typeof value === 'string' &&
    PASSWORD_PATTERN.test(value) &&
    Buffer.byteLength(value) <= 72
  );
}

function normalizeCity(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidCity(value) {
  const city = normalizeCity(value);
  return city.length >= 1 && city.length <= 100;
}

function toUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    city: user.city,
  };
}

module.exports = {
  normalizeEmail,
  isValidEmail,
  isValidPassword,
  normalizeCity,
  isValidCity,
  toUser,
};
