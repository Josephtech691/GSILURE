import { format, isValid } from 'date-fns';

/**
 * Parse une date provenant de l'API sans jamais propager Invalid Date.
 * Les dates SQL DATE (YYYY-MM-DD) sont traitées en heure locale à midi
 * pour éviter les décalages de fuseau horaire.
 */
export function safeDate(value) {
  if (value instanceof Date) return isValid(value) ? value : null;
  if (value === null || value === undefined || value === '') return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T12:00:00`)
    : new Date(raw);

  return isValid(dateValue) ? dateValue : null;
}

export function formatSafeDate(value, pattern, options = {}, fallback = '—') {
  const date = safeDate(value);
  return date ? format(date, pattern, options) : fallback;
}

export function formatDateOnly(value, pattern, options = {}, fallback = '—') {
  return formatSafeDate(value, pattern, options, fallback);
}
