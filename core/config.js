// Configuración de Firebase (cuenta de Google + respaldo en la nube).
// Pega aquí los datos de tu proyecto: console.firebase.google.com → Configuración del proyecto → Tus apps → Web.
// Mientras esté vacío, todo funciona en "modo local" (solo en este dispositivo).
export const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  appId: '',
};
export const hasFirebase = () => !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
