/**
 * Formatea una cadena ISO a fecha legible en español
 * Ejemplo: "2026-04-17T18:14:40" → "17/04/2026 18:14:40"
 */
export function formatDatetime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    const pad = n => String(n).padStart(2, '0');
    return (
      `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    );
  } catch {
    return isoString;
  }
}

/**
 * Formatea solo la hora de una cadena ISO
 * Ejemplo: "2026-04-17T18:14:40" → "18:14:40"
 */
export function formatTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return isoString;
  }
}

/**
 * Formatea solo la fecha
 * Ejemplo: "2026-04-17T18:14:40" → "17/04/2026"
 */
export function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch {
    return isoString;
  }
}

/**
 * Convierte segundos a formato legible
 * Ejemplo: 125 → "2m 5s"
 */
export function formatDuration(seconds) {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

/**
 * Convierte valor RMS a texto de intensidad
 */
export function intensityLabel(rms) {
  if (rms == null) return '—';
  if (rms < 0.3) return 'Leve';
  if (rms < 0.6) return 'Moderada';
  if (rms < 0.85) return 'Alta';
  return 'Severa';
}

/**
 * Color según intensidad
 */
export function intensityColor(rms) {
  if (rms == null) return '#6b7280';
  if (rms < 0.3) return '#22c55e';
  if (rms < 0.6) return '#f59e0b';
  if (rms < 0.85) return '#f97316';
  return '#ef4444';
}
