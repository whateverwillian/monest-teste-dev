const CEP_PATTERN = /^\d{5}-?\d{3}$|^\d{8}$/;

export function normalizeCep(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function isValidCepFormat(raw: string): boolean {
  return CEP_PATTERN.test(raw.trim());
}

export function validateAndNormalizeCep(raw: string): string {
  const trimmed = raw.trim();

  if (!isValidCepFormat(trimmed)) {
    throw new Error('INVALID_CEP_FORMAT');
  }

  const normalized = normalizeCep(trimmed);

  if (normalized.length !== 8) {
    throw new Error('INVALID_CEP_FORMAT');
  }

  return normalized;
}
