/**
 * SafePulse — Cloud Functions
 * 1. Recibe eventos desde el ESP32 por HTTP.
 * 2. Guarda el evento en Firestore.
 * 3. Cuando se crea un evento tipo crisis, manda push notification.
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

const PACIENTE_ID_DEFAULT = "0iVqnPC3gL3fyGcz1u1K";
const SECRET_ESP32 = "safepulse2025";

/**
 * FUNCIÓN 1:
 * Recibe un evento desde el ESP32 por HTTP POST
 * y lo guarda en Firestore dentro de "events".
 */
exports.recibirEventoESP32 = onRequest(
  {
    region: "southamerica-east1",
    cors: false,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Método no permitido. Usar POST.",
      });
    }

    if (!req.body || req.body.secret !== SECRET_ESP32) {
      return res.status(401).json({
        error: "No autorizado.",
      });
    }

    const {
      pacienteId,
      patientId,
      tipo,
      duracion,
      intensidad,
      estado,
      fuente,
      id_dispositivo,
      inicio_crisis,
      rms,
      cantidad_picos,
    } = req.body;

    const idPaciente = pacienteId || patientId || PACIENTE_ID_DEFAULT;

    const fechaLocal =
      inicio_crisis ||
      new Date()
        .toLocaleString("sv-SE", {
          timeZone: "America/Argentina/Buenos_Aires",
        })
        .replace(" ", "T");

    try {
      const docRef = await db.collection("events").add({
        patientId: idPaciente,
        pacienteId: idPaciente,

        fecha: fechaLocal,
        inicio_crisis: inicio_crisis || fechaLocal,

        tipo: tipo || "crisis",
        estado: estado || "activa",
        duracion: duracion ?? null,
        intensidad: intensidad ?? null,

        rms: rms ?? null,
        cantidad_picos: cantidad_picos ?? null,
        id_dispositivo: id_dispositivo || null,

        timestamp: FieldValue.serverTimestamp(),
        fuente: fuente || "esp32",
      });

      console.log("Evento creado desde ESP32:", docRef.id);

      return res.status(200).json({
        ok: true,
        version: "fecha-local-v2",
        eventoId: docRef.id,
        patientId: idPaciente,
        fecha: fechaLocal,
      });
    } catch (err) {
      console.error("Error creando evento desde ESP32:", err);
      return res.status(500).json({
        error: "Error interno creando evento.",
      });
    }
  }
);

/**
 * FUNCIÓN 2:
 * Escucha eventos nuevos en Firestore y manda push notification.
 */
exports.notificarCrisis = onDocumentCreated(
  {
    document: "events/{eventoId}",
    region: "southamerica-east1",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return null;

    const evento = snap.data();
    console.log("Nuevo evento:", JSON.stringify(evento));

    if (evento.tipo && evento.tipo !== "crisis") return null;

    const pacienteId =
      evento.pacienteId ||
      evento.patientId ||
      PACIENTE_ID_DEFAULT;

    let pacienteDoc;

    try {
      pacienteDoc = await db.collection("patients").doc(pacienteId).get();
    } catch (err) {
      console.error("Error leyendo paciente:", err);
      return null;
    }

    if (!pacienteDoc.exists) {
      console.error("Paciente no encontrado:", pacienteId);
      return null;
    }

    const paciente = pacienteDoc.data();
    const tokens = paciente.fcmTokens || [];

    if (tokens.length === 0) {
      console.warn("Paciente sin tokens FCM:", paciente.nombre);
      return null;
    }

    const titulo = "⚠️ Crisis epiléptica detectada";
    const cuerpo = `Paciente: ${
      paciente.nombre || paciente.name || "Desconocido"
    }. Revisá inmediatamente.`;

    const promesas = tokens.map(async (token) => {
      if (!token || typeof token !== "string") return null;

      const mensaje = {
        token,

        notification: {
          title: titulo,
          body: cuerpo,
        },

        android: {
          priority: "high",
          notification: {
            channelId: "safepulse_alertas",
            priority: "max",
            visibility: "public",
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },

        data: {
          pacienteId,
          eventoId: event.params.eventoId,
          tipo: evento.tipo || "crisis",
          timestamp: Date.now().toString(),
        },
      };

      try {
        const resp = await messaging.send(mensaje);
        console.log("Notificación enviada OK:", resp);
        return { token, exito: true };
      } catch (err) {
        console.error("Error enviando:", err.code, err.message);

        if (
          err.code === "messaging/invalid-registration-token" ||
          err.code === "messaging/registration-token-not-registered"
        ) {
          return { token, exito: false, invalido: true };
        }

        return { token, exito: false };
      }
    });

    const resultados = await Promise.all(promesas);

    const invalidos = resultados
      .filter((r) => r && r.invalido)
      .map((r) => r.token);

    if (invalidos.length > 0) {
      const limpios = tokens.filter((t) => !invalidos.includes(t));

      await db.collection("patients").doc(pacienteId).update({
        fcmTokens: limpios,
      });
    }

    return null;
  }
);