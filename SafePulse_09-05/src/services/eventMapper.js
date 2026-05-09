/**
 * Mapea el payload crudo del ESP32 (epilepsia/evento)
 * al formato interno de la app y de Firestore.
 *
 * Campos ESP32 → Campos internos
 *  id_dispositivo    → deviceId
 *  inicio_evento     → startTime
 *  fin_evento        → endTime
 *  duracion_segundos → durationSeconds
 *  rms               → intensity
 *  cantidad_picos    → peakCount
 *  deteccion         → deteccion
 *  estado_actual     → estadoActual
 *
 * patientId se pasa opcionalmente. Si es null, assigned=false facilita
 * el filtrado de eventos sin paciente asignado.
 */
export function mapEventToFirestore(raw, patientId = null) {
  return {
    deviceId: raw.id_dispositivo,
    startTime: raw.inicio_evento,
    endTime: raw.fin_evento,
    durationSeconds: raw.duracion_segundos,
    intensity: raw.rms,
    peakCount: raw.cantidad_picos,
    deteccion: raw.deteccion ?? null,
    estadoActual: raw.estado_actual ?? null,
    // patientId null = sin paciente activo al momento del evento
    patientId: patientId,
    // Campo auxiliar para filtrado fácil en Firestore/UI
    assigned: patientId !== null,
    createdAt: new Date().toISOString(),
  };
}
