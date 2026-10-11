/** Zona horaria de la aplicación (Bolivia, UTC-4, sin DST). */
export const APP_TIMEZONE = 'America/La_Paz';
export const APP_UTC_OFFSET = '-04:00';

/**
 * Interpreta fechas de MySQL (YYYY-MM-DD HH:MM:SS) como hora de Bolivia.
 */
export function parseAppDateTime(value) {
  if (value == null || value === '') return new Date(NaN);
  if (value instanceof Date) return value;

  const raw = String(value).trim();
  if (!raw) return new Date(NaN);

  // Ya trae zona (ISO con Z u offset)
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
    return new Date(raw);
  }

  // Solo fecha
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T00:00:00${APP_UTC_OFFSET}`);
  }

  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  return new Date(`${normalized}${APP_UTC_OFFSET}`);
}

/** Fecha YYYY-MM-DD en zona Bolivia. */
export function toIsoDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date instanceof Date ? date : new Date(date));
}

/** Fecha/hora legible en es-BO / America/La_Paz. */
export function formatDateTime(value) {
  if (value == null || value === '') return '—';
  const date = parseAppDateTime(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('es-BO', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Componentes de fecha en zona Bolivia. */
export function getAppDateParts(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    })
      .formatToParts(d)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: weekdayMap[parts.weekday] ?? 0,
  };
}

/** Suma días a una fecha YYYY-MM-DD en zona Bolivia. */
export function addDaysIso(isoDate, days) {
  const date = parseAppDateTime(`${isoDate}T12:00:00`);
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  return toIsoDate(date);
}

/**
 * Rango de fechas del dashboard / histórico en zona Bolivia.
 * @returns {{ from?: string, to?: string }}
 */
export function rangeForPeriod(period, customFrom, customTo) {
  const today = toIsoDate(new Date());
  const parts = getAppDateParts(new Date());

  if (period === 'all') {
    return { from: undefined, to: undefined };
  }

  if (period === 'today') {
    return { from: today, to: today };
  }

  if (period === 'week') {
    const diff = parts.weekday === 0 ? -6 : 1 - parts.weekday;
    return { from: addDaysIso(today, diff), to: today };
  }

  if (period === 'month') {
    const monthStart = `${parts.year}-${String(parts.month).padStart(2, '0')}-01`;
    return { from: monthStart, to: today };
  }

  return { from: customFrom || today, to: customTo || today };
}
