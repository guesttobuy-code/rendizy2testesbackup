// Ensure Node 16 has webcrypto/getRandomValues similar to Node 18+
const crypto = require('node:crypto');

if (!globalThis.crypto) {
  globalThis.crypto = crypto.webcrypto;
}

if (typeof crypto.getRandomValues !== 'function') {
  crypto.getRandomValues = (...args) => crypto.webcrypto.getRandomValues(...args);
}

if (typeof crypto.randomUUID !== 'function' && typeof crypto.webcrypto?.randomUUID === 'function') {
  crypto.randomUUID = (...args) => crypto.webcrypto.randomUUID(...args);
}
