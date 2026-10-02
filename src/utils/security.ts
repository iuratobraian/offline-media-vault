/**
 * Security validation and sanitization utility for Offline Media Vault.
 * Protects against SSRF, internal URL inspection, malicious scheme injections,
 * and hazardous file names.
 */

// Private & loopback IP regex patterns
const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^fc00:/i,
  /^fe80:/i,
  /^::1$/,
];

const DISALLOWED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'broadcasthost',
];

export interface UrlValidationResult {
  isValid: boolean;
  cleanUrl?: string;
  error?: string;
  isInternal?: boolean;
}

export function validateSafeUrl(rawUrl: string): UrlValidationResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Por favor, ingresa una URL válida.' };
  }

  // Handle local protocol for device imports
  if (trimmed.startsWith('local://')) {
    return { isValid: true, cleanUrl: trimmed };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { isValid: false, error: 'El formato de la URL no es válido.' };
  }

  // Restrict to safe HTTP/HTTPS protocols
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isValid: false,
      error: `Protocolo "${parsed.protocol}" no permitido. Usa http:// o https://`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check disallowed hostnames
  if (DISALLOWED_HOSTNAMES.includes(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return {
      isValid: false,
      isInternal: true,
      error: 'Acceso denegado: No se permiten URLs locales o de intranet por motivos de seguridad.',
    };
  }

  // Check private IP ranges
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return {
        isValid: false,
        isInternal: true,
        error: 'Acceso denegado: Direcciones IP privadas no permitidas.',
      };
    }
  }

  return { isValid: true, cleanUrl: parsed.href };
}

/**
 * Sanitizes file names to prevent path traversal and filesystem escape attempts.
 */
export function sanitizeFileName(name: string, fallback = 'archivo_media'): string {
  if (!name) return fallback;

  // Remove dangerous control characters and path traversal tokens
  let clean = name
    .replace(/\0/g, '')
    .replace(/\.\./g, '')
    .replace(/[<>:"/\\|?*]/g, '_')
    .trim();

  if (!clean || clean === '.' || clean === '..') {
    return fallback;
  }

  // Cap length to 120 chars while keeping extension
  if (clean.length > 120) {
    const extMatch = clean.match(/\.[0-9a-z]{2,5}$/i);
    const ext = extMatch ? extMatch[0] : '';
    clean = clean.slice(0, 120 - ext.length) + ext;
  }

  return clean;
}
