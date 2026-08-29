/**
 * Authentication and Security Helper for Horizon x CPU
 * Provides password hashing, email validation, and credential verification
 */

/**
 * Validates an email address format
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Validates a username (alphanumeric, underscore, 3-24 chars)
 * @param {string} username
 * @returns {boolean}
 */
export function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  const re = /^[a-zA-Z0-9_-]{3,24}$/;
  return re.test(username.trim());
}

/**
 * SHA-256 Hash implementation using Web Crypto API or fallback
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function hashPassword(text) {
  if (!text || typeof text !== 'string') return '';
  const salt = 'horizon_pos_salt_2026_';
  const data = new TextEncoder().encode(salt + text);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback if subtle crypto fails
    }
  }

  // Pure JS fast hash fallback
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  const str = salt + text;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'hz_' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

/**
 * Synchronous hash generator for instant sync calls
 * @param {string} text
 * @returns {string}
 */
export function hashPasswordSync(text) {
  if (!text || typeof text !== 'string') return '';
  const salt = 'horizon_pos_salt_2026_';
  const str = salt + text;
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'hz_' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}
