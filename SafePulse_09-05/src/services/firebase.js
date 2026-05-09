import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  limit,
  where,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB_va_uyP1YOYNhllJKJUSZeN5JmPq1OPA",
  authDomain: "tesis-2da9d.firebaseapp.com",
  projectId: "tesis-2da9d",
  storageBucket: "tesis-2da9d.firebasestorage.app",
  messagingSenderId: "85261584318",
  appId: "1:85261584318:web:05dc73094ddacdd79a9bef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── EVENTOS ──────────────────────────────────────────────────────────────────

export async function saveEventToFirestore(mappedEvent) {
  const eventsRef = collection(db, 'events');
  const docRef = await addDoc(eventsRef, mappedEvent);
  console.log('[Firestore] Evento guardado con ID:', docRef.id);
  return docRef.id;
}

/**
 * Obtiene los últimos N eventos.
 * - Sin patientId: trae todos sin filtro (evita requerir índice compuesto).
 * - Con patientId: filtra por paciente sin orderBy para no requerir índice.
 * El ordenamiento final se hace en memoria para máxima compatibilidad.
 */
export async function fetchEventsFromFirestore(limitCount = 100, patientId = null) {
  try {
    const eventsRef = collection(db, 'events');
    let q;

    if (patientId) {
      // Solo where, sin orderBy — no requiere índice compuesto
      q = query(eventsRef, where('patientId', '==', patientId), limit(limitCount));
    } else {
      // Solo limit, sin orderBy — funciona siempre
      q = query(eventsRef, limit(limitCount));
    }

    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Ordenar en memoria por el campo disponible (createdAt o startTime)
    docs.sort((a, b) => {
      const ta = a.createdAt || a.startTime || '';
      const tb = b.createdAt || b.startTime || '';
      return tb.localeCompare(ta);
    });

    return docs;
  } catch (err) {
    console.warn('[Firestore] fetchEventsFromFirestore falló, devolviendo []:', err.message);
    return [];
  }
}

// ─── PACIENTES ────────────────────────────────────────────────────────────────

export async function createPatient({ nombre, apellido = '', notas = '' }) {
  const patientsRef = collection(db, 'patients');
  const docRef = await addDoc(patientsRef, {
    nombre,
    apellido,
    notas,
    createdAt: new Date().toISOString(),
  });
  console.log('[Firestore] Paciente creado con ID:', docRef.id);
  return docRef.id;
}

export async function updatePatient(patientId, fields) {
  const ref = doc(db, 'patients', patientId);
  await updateDoc(ref, fields);
}

export async function fetchPatients() {
  try {
    const patientsRef = collection(db, 'patients');
    // Sin orderBy para evitar requerir índice
    const snapshot = await getDocs(patientsRef);
    const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Ordenar en memoria
    docs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return docs;
  } catch (err) {
    console.warn('[Firestore] fetchPatients falló, devolviendo []:', err.message);
    return [];
  }
}

export async function fetchPatientById(patientId) {
  try {
    const ref = doc(db, 'patients', patientId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    console.warn('[Firestore] fetchPatientById falló:', err.message);
    return null;
  }
}

export { db };
